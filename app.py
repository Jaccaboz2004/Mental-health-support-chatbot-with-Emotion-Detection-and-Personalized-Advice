from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# -----------------------
# Load Model & Vectorizer
# -----------------------
model_path = os.path.join("emotion_model", "emotion_model.pkl")
vectorizer_path = os.path.join("emotion_model", "tfidf_vectorizer.pkl")

model = joblib.load(model_path)
vectorizer = joblib.load(vectorizer_path)

print("✅ Model Loaded Successfully")


# -----------------------
# Intelligent Support Engine
# -----------------------
def generate_support_response(emotion, confidence):

    if confidence >= 0.85:
        severity = "high"
    elif confidence >= 0.65:
        severity = "medium"
    else:
        severity = "low"

    strategies = {
        "fear": {
            "high": "It seems you're feeling intense anxiety. Let’s try a grounding exercise: breathe in for 4 seconds, hold for 4, and exhale for 6.",
            "medium": "It sounds like something is worrying you. Would you like to talk more about it?",
            "low": "You might be slightly anxious. Taking a short break may help."
        },
        "sadness": {
            "high": "I’m really sorry you're feeling deeply sad. I'm here with you. Would you like to share more?",
            "medium": "It seems something is bringing you down. What happened recently?",
            "low": "It sounds like a mild low mood. Doing something small you enjoy could help."
        },
        "anger": {
            "high": "You seem very frustrated. Let’s pause and take 3 slow breaths together.",
            "medium": "It sounds like something upset you. Want to talk about it?",
            "low": "You might be slightly irritated. A short walk could help."
        },
        "joy": {
            "high": "That’s wonderful! What made you feel so happy?",
            "medium": "I’m glad you're feeling good! Tell me more about it.",
            "low": "Nice! Even small positive moments matter."
        },
        "love": {
            "high": "That’s beautiful. Love can be powerful and uplifting.",
            "medium": "It sounds like someone special is on your mind.",
            "low": "Warm feelings are meaningful."
        },
        "surprise": {
            "high": "That must have been unexpected! How did it make you feel?",
            "medium": "Unexpected things can be interesting. Tell me more.",
            "low": "Sounds like something caught you off guard."
        }
    }

    return strategies.get(emotion, {}).get(severity, "I’m here to listen. Tell me more.")


# -----------------------
# Home Route
# -----------------------
@app.route("/")
def home():
    return "Mental Health Emotion Detection API Running 🚀"


# -----------------------
# Emotion Prediction Route
# -----------------------
@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    user_text = data.get("text", "")

    if user_text == "":
        return jsonify({"error": "No text provided"}), 400

    # Preprocess
    from emotion_model.preprocess import clean_text
    clean = clean_text(user_text)

    # Vectorize
    vector = vectorizer.transform([clean])

    # Predict
    emotion = model.predict(vector)[0]
    confidence = float(max(model.predict_proba(vector)[0]))

    # Generate intelligent support
    support_message = generate_support_response(emotion, confidence)

    return jsonify({
        "emotion": emotion,
        "confidence": round(confidence, 2),
        "support": support_message
    })


# -----------------------
# Run App
# -----------------------
if __name__ == "__main__":
    app.run(debug=True)
