from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Form
from dotenv import load_dotenv # Trigger uvicorn reload
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import logging
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import List, Optional
import pymongo
from openai import AsyncOpenAI
from pathlib import Path
import numpy as np
import pandas as pd
import pickle
import re
import hashlib
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends

# 1. Load variables with explicit path check
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# Initialize OpenAI Client (using Groq API compatibility)
api_key = os.environ.get("GROQ_API_KEY", "")
# Safely print first 10 chars of key for debug
key_preview = api_key[:10] if api_key else "None"
print(f"Server initialized with Groq API Key starting with: {key_preview}")
client = AsyncOpenAI(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1"
)

gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
gemini_client = AsyncOpenAI(
    api_key=gemini_api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

# 2. DB Setup
import certifi
mongo_url = os.environ.get('MONGO_URL', "mongodb://localhost:27017")
db_client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True, serverSelectionTimeoutMS=5000)
db = db_client[os.environ.get('DB_NAME', "mental_health_db")]

# 3. Load RAG Vector Store
print("Loading vector store for RAG...")
try:
    with open("models/vector_store.pkl", "rb") as f:
        formatted_df = pickle.load(f)
    print(f"Loaded {len(formatted_df)} therapy examples.")
except Exception as e:
    print(f"Warning: Could not load vector_store.pkl: {e}")
    formatted_df = None

def retrieve_similar_responses(query: str, top_k: int = 3) -> list:
    if formatted_df is None:
        return []
    
    # We will use the Gemini async client we already have configured in server.py
    return [] # Placeholder, will be replaced with async version inside the endpoint

app = FastAPI(title="AI Mental Health Companion")

# CORS — must be registered BEFORE routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.0.101:3000",
        "http://localhost:3001", "http://127.0.0.1:3001", "http://192.168.0.104:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Pydantic Models
class UserSignup(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class AnalyzeRequest(BaseModel):
    text: str
    companion_type: Optional[str] = "companion" # Default fallback
    user_id: Optional[str] = "anonymous"
    language: Optional[str] = "English"
    facial_context: Optional[str] = None

class AnalyzeResponse(BaseModel):
    emotion: str
    confidence: str
    support: str
    recommendations: List[str] = Field(default_factory=list)
    insight: Optional[str] = None

class CBTRequest(BaseModel):
    thought: str
    user_id: Optional[str] = "anonymous"

class CBTResponse(BaseModel):
    distortions: List[str]
    reframe: str

class MoodRequest(BaseModel):
    message: str
    user_id: Optional[str] = "anonymous"

class MoodResponse(BaseModel):
    emotion: str
    insight: Optional[str] = None
    timestamp: str

class JournalEntry(BaseModel):
    user_id: str
    content: str
    mood_prompt: Optional[str] = ""

class JournalResponse(BaseModel):
    id: str
    content: str
    mood_prompt: str
    ai_summary: str
    detected_emotion: str
    timestamp: str

class SmartNotificationRequest(BaseModel):
    type: str
    user_id: Optional[str] = "anonymous"

class SmartNotificationResponse(BaseModel):
    message: str

# 4. Endpoints
@app.get("/")
async def root():
    """Verify the API is live - As seen in your browser screenshot!"""
    return {
        "status": "online",
        "message": "AI Mental Health Companion API is live!",
        "endpoints": ["/api/analyze", "/api/conversations"]
    }

# --- Auth Endpoints ---
SECRET_KEY = os.environ.get("JWT_SECRET", "super-secret-key-change-in-production")
ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return "anonymous"
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return "anonymous"
        return username
    except jwt.PyJWTError:
        return "anonymous"

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@app.post("/api/signup")
async def signup(request: UserSignup):
    try:
        existing_user = await db.users.find_one({"username": request.username})
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        user_doc = {
            "username": request.username,
            "password": hash_password(request.password)
        }
        await db.users.insert_one(user_doc)
        
        token = create_access_token(data={"sub": request.username})
        return {"status": "success", "username": request.username, "token": token}
    except pymongo.errors.ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database connection failed: Please whitelist your IP in MongoDB Atlas.")
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/login")
async def login(request: UserLogin):
    try:
        user = await db.users.find_one({"username": request.username})
        if not user or user["password"] != hash_password(request.password):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        token = create_access_token(data={"sub": request.username})
        return {"status": "success", "username": request.username, "token": token}
    except pymongo.errors.ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database connection failed: Please whitelist your IP in MongoDB Atlas.")
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

# --- Chat Endpoints ---
@app.get("/api/conversations")
async def get_conversations(
    user_id: str = Depends(get_current_user), 
    query_user_id: Optional[str] = None,
    companion_type: Optional[str] = None
):
    final_user_id = user_id if user_id != "anonymous" else (query_user_id or "anonymous")
    try:
        query = {"user_id": final_user_id}
        if companion_type:
            query["companion"] = companion_type
            
        cursor = db.conversations.find(query).sort("timestamp", -1).limit(50)
        conversations = await cursor.to_list(length=50)
        for conv in conversations:
            conv["_id"] = str(conv["_id"])
        return conversations
    except Exception as e:
        logging.error(f"Error fetching conversations: {e}")
        # Fallback for when MongoDB is not running locally
        return []

@app.delete("/api/conversations")
async def clear_conversations(user_id: str = Depends(get_current_user), query_user_id: Optional[str] = None):
    final_user_id = user_id if user_id != "anonymous" else (query_user_id or "anonymous")
    try:
        await db.conversations.delete_many({"user_id": final_user_id})
        return {"status": "success", "message": "Conversations cleared for user"}
    except Exception as e:
        logging.error(f"Error clearing conversations: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_emotion(request: AnalyzeRequest, authorized_user: str = Depends(get_current_user)):
    try:
        final_user_id = authorized_user if authorized_user != "anonymous" else request.user_id
        # Pass 1: Analyze Emotion
        facial_info = f" (Facial Emotion detected: {request.facial_context})" if request.facial_context else ""
        emo_resp = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"Analyze the user's text{facial_info}. Respond ONLY as:\nEmotion: [Name]\nConfidence: [XX]%\nRecommendations: [Comma-separated list of 3 short self-care activities. CRITICAL: If the user is already asking to do a specific activity, output 'None']. Translate recommendations to {request.language}."},
                {"role": "user", "content": request.text}
            ],
            temperature=0
        )
        raw_output = emo_resp.choices[0].message.content
        
        # Robust Parsing
        emotion = "Neutral"
        confidence = "100%"
        recommendations = []
        insight = None
        for line in raw_output.split('\n'):
            if "Emotion:" in line: emotion = line.split(":", 1)[1].strip()
            if "Confidence:" in line: confidence = line.split(":", 1)[1].strip()
            if "Recommendations:" in line: 
                recs_str = line.split(":", 1)[1].strip()
                if recs_str.lower() not in ["none", "'none'", "[]", ""]:
                    recommendations = [r.strip() for r in recs_str.split(',') if r.strip()]

        # Pass 2: RAG Context Retrieval
        context_str = ""
        if formatted_df is not None:
            try:
                # 1. Embed user query using Gemini
                embed_resp = await gemini_client.embeddings.create(
                    input=request.text,
                    model="text-embedding-004"
                )
                query_vec = np.array(embed_resp.data[0].embedding)
                
                # 2. Find similar past conversations
                similarities = []
                for _, row in formatted_df.iterrows():
                    sim_score = np.dot(query_vec, np.array(row["embedding"]))
                    similarities.append({
                        "user": row["user"],
                        "therapist": row["therapist"],
                        "score": sim_score
                    })
                
                # 3. Sort and get top examples
                top_matches = sorted(similarities, key=lambda x: x["score"], reverse=True)[:3]
                context_str = "\n".join([
                    f"Example User: {item['user']}\nExample Therapist: {item['therapist']}"
                    for item in top_matches
                ])
                if context_str:
                    context_str = "\n\nRelevant past therapy examples for inspiration:\n" + context_str
            except Exception as e:
                logging.error(f"RAG Retrieval Error: {e}")

        # Pass 2.5: Rich User Memory Retrieval
        recent_history_str = "\n\nINSTRUCTIONS: If no previous data exists:\n- Simply greet and ask how you can help."
        if final_user_id and final_user_id != "anonymous":
            try:
                # Fetch last 15 conversations strictly for the current companion type!
                mem_cursor = db.conversations.find({
                    "user_id": final_user_id,
                    "companion": request.companion_type
                }).sort("timestamp", -1).limit(15)
                mem_convos = await mem_cursor.to_list(length=15)

                if mem_convos:
                    # ── 1. User name (from user_id, strip @domain if email) ──
                    display_name = final_user_id.split("@")[0].split(".")[0].capitalize()

                    # ── 2. Past mood + topic pairs (newest first) ──
                    mood_entries = []
                    for conv in mem_convos:
                        emotion  = conv.get("emotion", "")
                        u_msg    = conv.get("user_message", "")
                        ts       = conv.get("timestamp", "")
                        if emotion and u_msg:
                            # Shorten the message to a key topic phrase
                            topic = u_msg[:60].strip()
                            mood_entries.append({"emotion": emotion, "topic": topic, "ts": ts})

                    # ── 3. Dominant mood (most frequent in last 15) ──
                    from collections import Counter
                    emotion_counts = Counter(e["emotion"].lower() for e in mood_entries if e["emotion"])
                    dominant_mood = emotion_counts.most_common(1)[0][0] if emotion_counts else ""

                    # ── 4. Most recent 3 full exchanges (chronological) ──
                    recent_3 = list(reversed(mem_convos[:3]))
                    exchange_lines = []
                    for conv in recent_3:
                        u  = conv.get("user_message", "")
                        ai = conv.get("ai_response", "")
                        em = conv.get("emotion", "")
                        snip = ai[:80].strip() if ai else ""
                        if u:
                            exchange_lines.append(f"  • User said: \"{u[:70]}\" → Felt: {em}")
                            if snip:
                                exchange_lines.append(f"    AI replied: \"{snip}...\"")

                    # ── 5. Recurring keywords / themes ──
                    import re as _re
                    all_text = " ".join(c.get("user_message","") for c in mem_convos).lower()
                    theme_words = ["exam", "work", "job", "stress", "anxiety", "family", "friend",
                                   "sleep", "lonely", "sad", "happy", "relationship", "study",
                                   "health", "money", "future", "school", "college", "parent"]
                    themes_found = [w for w in theme_words if _re.search(r'\b' + w, all_text)]
                    themes_str = ", ".join(themes_found[:4]) if themes_found else ""

                    # ── 6. Build the memory block ──
                    mem_lines = [
                        f"\n\n━━━ PERSONALIZED MEMORY FOR THIS USER ━━━",
                        f"Name: {display_name}",
                    ]
                    if dominant_mood:
                        mem_lines.append(f"Dominant recent mood: {dominant_mood}")
                    if themes_str:
                        mem_lines.append(f"Recurring life themes: {themes_str}")
                    if mood_entries:
                        mem_lines.append(f"Last notable moment: felt '{mood_entries[0]['emotion']}' about \"{mood_entries[0]['topic']}\"")
                    if exchange_lines:
                        mem_lines.append("Recent conversation snapshots:")
                        mem_lines.extend(exchange_lines)
                    mem_lines.append(
                        "INSTRUCTIONS: You are a personalized AI wellness assistant with contextual memory.\n"
                        "You remember past user interactions including emotions, food habits, and health behavior.\n"
                        "When the user starts a new session:\n"
                        "- If past data exists, greet the user with a personalized message referring to their last known state.\n"
                        "- Ask a relevant follow-up question.\n"
                        "- Suggest improvements in food habits and daily exercise if needed.\n"
                        "Guidelines:\n"
                        "- Be empathetic and supportive\n"
                        "- Keep responses natural and human-like\n"
                        "- Focus on continuity between past and present interaction\n"
                        "- Encourage healthy lifestyle changes\n"
                        "Example response:\n"
                        "\"Welcome back! Last time you seemed a bit stressed and your diet wasn't very balanced. How are you feeling today? Maybe we can start with a healthy meal and some light exercise.\""
                    )
                    mem_lines.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
                    recent_history_str = "\n".join(mem_lines)

            except Exception as e:
                logging.error(f"Memory Retrieval Error: {e}")

        # Pass 3: Personality Mapping & Generation
        # These keys match the 'id' fields in your LandingPage.js companions array
        personalities = {
            "crisis": "You are a crisis support specialist. Be urgent, calm, and provide immediate resources.",
            "anxiety": "You are a Calm Coach. Focus on breathing, grounding techniques, and stress management.",
            "mindful": "You are a Mindful Guide. Use wise, serene language focused on present-moment awareness.",
            "friend": "You are a caring friend. Be informal, warm, and use very supportive, relatable language.",
            "wellness": "You are a Wellness Mentor. Focus on motivation, healthy habits, and physical well-being.",
            "companion": "You are an empathetic AI counselor with expert knowledge in CBT and psychology.",
            "music": "You are a Music Therapist. Focus on the emotional power of sound and music to heal the mind, recommending rhythmic self-care, and discussing how rhythms and melodies can soothe the nervous system.",
            "nutritionist": "You are a personalized AI wellness assistant. You specialize in tracking mood, food cravings, and health behavior to suggest balanced alternatives alongside emotional support. CRITICAL: NEVER provide full diet plans, recipes, or lists. If asked for a diet plan, politely decline in 1 sentence and ask about their day instead."
        }
        
        system_role = personalities.get(request.companion_type, personalities["companion"])
        
        prompt = f"""{system_role}
The user is currently feeling {emotion}. 

CRITICAL RULES:
1. MAX LENGTH: Your response MUST be extremely brief—only 1 to 3 very short sentences. Write exactly like a natural human texting a friend. No lists, bullet points, or robotic tone.
2. STRICT BOUNDARIES: You MUST strictly stay in character. ONLY discuss topics explicitly related to your assigned role. NEVER talk about food, cooking, or diets UNLESS you are the Food Therapist. If the user asks about an unrelated topic, politely redirect them back to your specific specialty in 1 sentence.
Use {request.language} and weave their emotion in naturally.{recent_history_str}{context_str}"""

        
        user_message_for_llm = request.text
        if request.text == "[SESSION_START]":
            user_message_for_llm = "(The user has started the session. Please provide the personalized greeting and follow-up question now per your instructions. Do not mention that a session started, just greet them naturally.)"

        sup_resp = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_message_for_llm}
            ]
        )
        support_text = sup_resp.choices[0].message.content

        # 5. Save to MongoDB
        if request.text != "[SESSION_START]":
            try:
                await db.conversations.insert_one({
                    "session_id": str(uuid.uuid4()),
                    "user_id": final_user_id,
                    "companion": request.companion_type,
                    "system_role": system_role,
                    "user_message": request.text,
                    "emotion": emotion,
                    "confidence": confidence,
                    "recommendations": recommendations,
                    "insight": insight,
                    "context_used": "Yes" if context_str else "No",
                    "ai_response": support_text,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            except Exception as db_err:
                pass

        return AnalyzeResponse(
            emotion=emotion,
            confidence=confidence,
            support=support_text,
            recommendations=recommendations,
            insight=insight
        )

    except Exception as e:
        with open("error.log", "w") as f:
            import traceback
            f.write(traceback.format_exc())
        logging.error(f"Error in analyze_emotion: {e}")
        # FALLBACK for invalid API Key
        fallback_emotion = "Anxious"
        fallback_confidence = "80%"
        fallback_recs = ["breathing exercise", "meditation", "journaling", "listening to music"]
        comp_type = request.companion_type or "companion"
        display_type = "" if comp_type.lower() == "companion" else f"{comp_type} "
        fallback_support = f"(Demonstration Mode - API Key Invalid)\nI am your {display_type}companion. Since the API key is unavailable or the service is down, I am running in fallback mode. I hear that you are feeling {fallback_emotion}. Please take a deep breath."
        
        # Still try to save to DB (will fail if MongoDB isn't running, but we catch it)
        try:
            await db.conversations.insert_one({
                "session_id": str(uuid.uuid4()),
                "user_id": final_user_id,
                "companion": request.companion_type,
                "system_role": system_role if 'system_role' in locals() else "fallback",
                "user_message": request.text,
                "emotion": fallback_emotion,
                "confidence": fallback_confidence,
                "recommendations": fallback_recs,
                "context_used": "No",
                "ai_response": fallback_support,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        except:
            pass
            
        return AnalyzeResponse(
            emotion=fallback_emotion, 
            confidence=fallback_confidence, 
            support=fallback_support,
            recommendations=fallback_recs
        )

# --- Voice/Acoustic Analysis Endpoint ---
import tempfile
import json

@app.post("/api/analyze-voice")
async def analyze_voice(
    file: UploadFile = File(...),
    companion_type: str = Form("companion"),
    user_id: str = Form("anonymous"),
    language: str = Form("English")
):
    final_user_id = user_id
    try:
        # 1. Save uploaded WebM file to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_file.write(await file.read())
            temp_path = temp_file.name

        # 2. Use Groq Whisper API for lightning-fast transcription with filler words
        with open(temp_path, "rb") as f:
            transcription = await client.audio.transcriptions.create(
                file=(file.filename, f.read()),
                model="whisper-large-v3-turbo",
            )
        
        transcript = transcription.text
        os.remove(temp_path)

        # 3. Analyze Emotion based on transcript and conversational pace instructions
        emo_resp = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system", 
                    "content": f"You are analyzing a VOICE NOTE transcript. The user spoke these words out loud. Detect their emotional tone based on their word choice, any hesitations, and punctuation. Respond ONLY as:\nEmotion: [Name]\nConfidence: [XX]%\nRecommendations: [Comma-separated list of 3 self-care activities]. Translate recommendations to {language}."
                },
                {"role": "user", "content": transcript}
            ],
            temperature=0
        )
        raw_output = emo_resp.choices[0].message.content
        
        # Parse output
        emotion = "Neutral"
        confidence = "100%"
        recommendations = []
        for line in raw_output.split('\n'):
            if "Emotion:" in line: emotion = line.split(":", 1)[1].strip()
            if "Confidence:" in line: confidence = line.split(":", 1)[1].strip()
            if "Recommendations:" in line: 
                recs_str = line.split(":", 1)[1].strip()
                if recs_str.lower() not in ["none", "'none'", "[]", ""]:
                    recommendations = [r.strip() for r in recs_str.split(',') if r.strip()]

        # 4. Generate Support Response based on companion personality
        personalities = {
            "crisis": "You are a crisis support specialist. Be urgent, calm, and provide immediate resources.",
            "anxiety": "You are a Calm Coach. Focus on breathing, grounding techniques, and stress management.",
            "mindful": "You are a Mindful Guide. Use wise, serene language focused on present-moment awareness.",
            "friend": "You are a caring friend. Be informal, warm, and use very supportive, relatable language.",
            "wellness": "You are a Wellness Mentor. Focus on motivation, healthy habits, and physical well-being.",
            "companion": "You are an empathetic AI counselor with expert knowledge in CBT and psychology.",
            "music": "You are a Music Therapist. Focus on the emotional power of sound and music.",
            "nutritionist": "You are an AI that analyzes mood and food cravings. 1. Detect emotion 2. Predict a craving 3. Suggest a balanced option (healthy + small treat). CRITICAL: NEVER provide full diet plans, recipes, or lists. If asked for a diet plan, politely decline in 1 sentence and ask about their day instead."
        }
        system_role = personalities.get(companion_type, personalities["companion"])
        
        sup_prompt = f"""{system_role}
Their tone sounds {emotion}. Based on a voice note saying: '{transcript}', 
CRITICAL RULES:
1. MAX LENGTH: Your response MUST be extremely brief—only 1 to 3 very short sentences. Write exactly like a natural human texting a friend. No lists, bullet points, or robotic tone.
2. STRICT BOUNDARIES: You MUST strictly stay in character. ONLY discuss topics explicitly related to your assigned role. NEVER talk about food, cooking, or diets UNLESS you are the Food Therapist. If the user asks about an unrelated topic, politely redirect them back to your specific specialty in 1 sentence.
Use {language}."""
        sup_resp = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": sup_prompt},
                {"role": "user", "content": transcript}
            ]
        )
        support_text = sup_resp.choices[0].message.content

        # 5. DB Save (If connected)
        try:
            await db.conversations.insert_one({
                "session_id": str(uuid.uuid4()),
                "user_id": final_user_id,
                "companion": companion_type,
                "system_role": system_role,
                "user_message": f"[VOICE] {transcript}",
                "emotion": emotion,
                "confidence": confidence,
                "recommendations": recommendations,
                "context_used": "No",
                "ai_response": support_text,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        except Exception as db_err:
            pass

        return {
            "transcript": transcript,
            "emotion": emotion,
            "confidence": confidence,
            "support": support_text,
            "recommendations": recommendations
        }
    except Exception as e:
        import traceback
        logging.error(f"Voice Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Voice error")

@app.post("/api/cbt-reframe", response_model=CBTResponse)
async def analyze_cbt_thought(request: CBTRequest, authorized_user: str = Depends(get_current_user)):
    final_user_id = authorized_user if authorized_user != "anonymous" else request.user_id
    try:
        cbt_prompt = f"""You are an expert Cognitive Behavioral Therapist.
The user has shared a negative automatic thought.
1. Identify any Cognitive Distortions present (e.g., Catastrophizing, Black-and-White Thinking, Jumping to Conclusions, Emotional Reasoning).
2. Provide a rational, empathetic reframe to help the user see the situation more objectively.

Format exactly like this:
Distortions: [Comma separated list]
Reframe: [Your 3-4 sentence gentle reframing response]

User Thought: "{request.thought}"
"""
        logging.info(f"CBT PROMPT:\n{repr(cbt_prompt)}")
        cbt_resp = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "user", "content": cbt_prompt}
            ]
        )
        content = cbt_resp.choices[0].message.content
        
        distortions = ["Unhelpful Thinking Style"]
        reframe = "It's understandable to feel this way. Let's try to look at the evidence objectively."
        
        for line in content.split('\n'):
            if line.startswith("Distortions:"):
                raw_dist = line.replace("Distortions:", "").strip()
                distortions = [d.strip() for d in raw_dist.split(",") if d.strip()]
            if line.startswith("Reframe:"):
                reframe = line.replace("Reframe:", "").strip()

        return CBTResponse(distortions=distortions, reframe=reframe)
    except Exception as e:
        logging.error(f"CBT Error: {e}")
        return CBTResponse(distortions=["Unknown"], reframe="(Demonstration Mode) That's a difficult thought to carry. Can we break it down into smaller, more manageable facts?")
        

# ── Mood Tracker Endpoint ─────────────────────────────────────────────
@app.post("/api/mood-tracker/log", response_model=MoodResponse)
async def log_mood(request: MoodRequest):
    """Standalone mood tracker endpoint based strictly on user requirement."""
    try:
        now_ts = datetime.now(timezone.utc).isoformat()
        today_date = now_ts[:10]
        
        # 1. Fetch previous entries for today to analyze trend
        trend_str = ""
        if request.user_id and request.user_id != "anonymous":
            try:
                hist_cursor = db.mood_logs.find({
                    "user_id": request.user_id,
                    "timestamp": {"$regex": f"^{today_date}"}
                }).sort("timestamp", 1).limit(20)
                hist = await hist_cursor.to_list(length=20)
                if hist:
                    trend_str = "Prior entries today:\n" + "\n".join([f"Time: {h['timestamp'][11:16]} | Emotion: {h['emotion']}" for h in hist])
            except Exception:
                pass

        # 2. Analyze emotion and insight explicitly
        prompt = f"""User chat: {request.message}
Time: {now_ts}

Detect emotion from message and classify as ONLY ONE OF:
happy, sad, stressed, angry, neutral

{trend_str}
If multiple entries exist:
- Analyze trend
- Generate short daily insight

Output EXACTLY in this format:
EMOTION: [label]
INSIGHT: [Optional short insight based on trend, or 'None']"""

        resp = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": prompt}],
            temperature=0
        )
        content = resp.choices[0].message.content
        
        emotion = "neutral"
        insight = None
        for line in content.split('\\n'):
            if "EMOTION:" in line: emotion = line.split(":", 1)[1].strip().lower()
            if "INSIGHT:" in line: 
                raw_ins = line.split(":", 1)[1].strip()
                if raw_ins.lower() not in ["none", "'none'", "[]", ""]: insight = raw_ins

        # 3. Store result with timestamp
        if request.user_id and request.user_id != "anonymous":
            try:
                await db.mood_logs.insert_one({
                    "user_id": request.user_id,
                    "message": request.message,
                    "emotion": emotion,
                    "insight": insight,
                    "timestamp": now_ts
                })
            except Exception as dberr:
                logging.error(f"Mood Log DB Error: {dberr}")

        return MoodResponse(
            emotion=emotion,
            insight=insight,
            timestamp=now_ts
        )
    except Exception as e:
        logging.error(f"Mood Tracker Error: {e}")
        return MoodResponse(emotion="neutral", insight=None, timestamp=datetime.now(timezone.utc).isoformat())




# ── Journal Endpoints ──────────────────────────────────────────────────

@app.post("/api/journal/save")
async def save_journal_entry(entry: JournalEntry):
    """Save a journal entry and return an AI-generated mood summary."""
    # ── AI mood analysis (best-effort — entry saves even if AI fails) ──
    detected_emotion = "reflective"
    ai_summary = "It sounds like you had a lot on your mind today. Your feelings are valid, and writing them down is a powerful first step."

    try:
        summary_prompt = f"""The user wrote this journal entry:

\"\"\"{entry.content}\"\"\"

Prompt they answered: "{entry.mood_prompt or 'How do you feel today?'}"

Tasks:
1. Detect dominant emotion in 1-3 words (e.g., stressed, anxious, hopeful, joyful, tired, calm)
2. Write a warm 1-2 sentence empathetic therapist summary starting with "You seem..." or "It sounds like..."

Respond ONLY in this format:
EMOTION: <emotion>
SUMMARY: <summary>"""

        resp = await client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": summary_prompt}],
            max_tokens=120,
            temperature=0.5,
        )
        raw = resp.choices[0].message.content.strip()
        for line in raw.split("\n"):
            line = line.strip()
            if line.startswith("EMOTION:"):
                detected_emotion = line.replace("EMOTION:", "").strip().lower()
            elif line.startswith("SUMMARY:"):
                ai_summary = line.replace("SUMMARY:", "").strip()
    except Exception as ai_err:
        logging.warning(f"Journal AI analysis skipped (fallback used): {ai_err}")
        # Keyword fallback
        text_lower = entry.content.lower()
        if any(w in text_lower for w in ["stress", "overwhelm", "pressure", "deadline"]):
            detected_emotion, ai_summary = "stressed", "You seem to be carrying a lot of pressure right now. Remember to breathe and take it one step at a time."
        elif any(w in text_lower for w in ["sad", "cry", "unhappy", "depress", "grief"]):
            detected_emotion, ai_summary = "sad", "It sounds like today was heavy emotionally. It's okay to feel this way — your feelings deserve space."
        elif any(w in text_lower for w in ["happy", "joy", "excit", "great", "wonderful"]):
            detected_emotion, ai_summary = "joyful", "You seem to be in a positive place today! It's wonderful that you're noticing these good moments."
        elif any(w in text_lower for w in ["anx", "worr", "nervous", "fear"]):
            detected_emotion, ai_summary = "anxious", "You seem to be feeling anxious. Writing it out is already a courageous act — you're not alone in this."
        elif any(w in text_lower for w in ["tired", "exhaust", "sleep", "fatigue"]):
            detected_emotion, ai_summary = "tired", "It sounds like you're running low on energy. Rest is not laziness — your body and mind need recovery."

    # ── Save to MongoDB ──
    try:
        doc = {
            "user_id": entry.user_id,
            "content": entry.content,
            "mood_prompt": entry.mood_prompt or "",
            "ai_summary": ai_summary,
            "detected_emotion": detected_emotion,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        result = await db.journal_entries.insert_one(doc)
        return {
            "id": str(result.inserted_id),
            "content": entry.content,
            "mood_prompt": entry.mood_prompt or "",
            "ai_summary": ai_summary,
            "detected_emotion": detected_emotion,
            "timestamp": doc["timestamp"],
        }
    except Exception as e:
        logging.error(f"Journal Save DB Error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/journal/entries")
async def get_journal_entries(user_id: str, limit: int = 30):
    """Fetch recent journal entries for a user."""
    try:
        cursor = db.journal_entries.find({"user_id": user_id}).sort("timestamp", -1).limit(limit)
        entries = await cursor.to_list(length=limit)
        result = []
        for e in entries:
            result.append({
                "id": str(e["_id"]),
                "content": e.get("content", ""),
                "mood_prompt": e.get("mood_prompt", ""),
                "ai_summary": e.get("ai_summary", ""),
                "detected_emotion": e.get("detected_emotion", ""),
                "timestamp": e.get("timestamp", ""),
            })
        return result
    except Exception as ex:
        logging.error(f"Journal Fetch Error: {ex}")
        raise HTTPException(status_code=500, detail=str(ex))


@app.delete("/api/journal/{entry_id}")
async def delete_journal_entry(entry_id: str, user_id: str):
    """Delete a journal entry by ID."""
    try:
        from bson import ObjectId
        result = await db.journal_entries.delete_one(
            {"_id": ObjectId(entry_id), "user_id": user_id}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Entry not found")
        return {"success": True}
    except Exception as ex:
        logging.error(f"Journal Delete Error: {ex}")
        raise HTTPException(status_code=500, detail=str(ex))


# ── Feedback Endpoints ────────────────────────────────────────────────

class FeedbackSubmission(BaseModel):
    name: str
    email: str
    rating: int          # 1-5
    features: List[str] = Field(default_factory=list)
    feedback_type: Optional[str] = ""
    message: str
    user_id: Optional[str] = "anonymous"  # linked to logged-in account

@app.post("/api/feedback")
async def submit_feedback(payload: FeedbackSubmission):
    """Save user feedback to MongoDB. Email is stored but never shared."""
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="Name is required.")
    if "@" not in payload.email:
        raise HTTPException(status_code=422, detail="Valid email is required.")
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=422, detail="Rating must be between 1 and 5.")
    if not payload.message.strip():
        raise HTTPException(status_code=422, detail="Message is required.")

    try:
        doc = {
            "user_id": payload.user_id or "anonymous",
            "name": payload.name.strip(),
            "email": payload.email.strip().lower(),
            "rating": payload.rating,
            "features": payload.features,
            "feedback_type": payload.feedback_type or "",
            "message": payload.message.strip(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        result = await db.feedback.insert_one(doc)
        return {"status": "success", "id": str(result.inserted_id)}
    except pymongo.errors.ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database connection failed.")
    except Exception as e:
        logging.error(f"Feedback Save Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Smart Notifications Endpoint ───────────────────────────────────────

@app.post("/api/smart-notification", response_model=SmartNotificationResponse)
async def generate_smart_notification(request: SmartNotificationRequest):
    try:
        prompts = {
            "mood": "Generate a short, 1-2 sentence empathetic check-in asking the user how they are feeling today. Be warm and supportive like a good friend.",
            "breathing": "Generate a short, 1-2 sentence gentle reminder to take a deep breath or do a quick breathing exercise. Make it calming.",
            "journal": "Generate a short, 1-2 sentence encouraging reminder to write in their daily journal to reflect on their thoughts.",
            "tasks": "Generate a short, 1-2 sentence friendly reminder to complete their daily self-care tasks or just take care of themselves.",
            "encourage": "Generate a short, 1-2 sentence uplifting and inspiring quote or message of encouragement."
        }
        
        system_prompt = prompts.get(request.type, prompts["encourage"])
        
        resp = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are Lumina AI, a deeply empathetic mental health companion. Your messages must be extremely brief (1-2 sentences max), warm, and human-like. DO NOT use hashtags, emojis, or robotic formatting. Just natural text."},
                {"role": "user", "content": system_prompt}
            ],
            temperature=0.7
        )
        message = resp.choices[0].message.content.strip()
        
        if message.startswith('"') and message.endswith('"'):
            message = message[1:-1]
            
        return SmartNotificationResponse(message=message)
    except Exception as e:
        logging.error(f"Smart Notification Error: {e}")
        fallbacks = {
            "mood": "How are you feeling today? I'm here to listen.",
            "breathing": "Don't forget your breathing exercise. Take a moment for yourself.",
            "journal": "Take 5 minutes to write in your journal. Your thoughts deserve a space.",
            "tasks": "Have you completed your self-care tasks today? Small habits = big changes.",
            "encourage": "You are doing better than you think. Keep going."
        }
        return SmartNotificationResponse(message=fallbacks.get(request.type, fallbacks["encourage"]))

# (CORS already registered at top)