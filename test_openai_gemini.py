import asyncio
import os
from openai import AsyncOpenAI
from pydantic import BaseModel

api_key = os.environ.get("GEMINI_API_KEY")
client = AsyncOpenAI(
    api_key=api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

async def test():
    thought = "i call my friend for 3 times they didn't response they block my number or they hate me"
    cbt_prompt = f"""You are an expert Cognitive Behavioral Therapist.
The user has shared a negative automatic thought.
1. Identify any Cognitive Distortions present (e.g., Catastrophizing, Black-and-White Thinking, Jumping to Conclusions, Emotional Reasoning).
2. Provide a rational, empathetic reframe to help the user see the situation more objectively.

Format exactly like this:
Distortions: [Comma separated list]
Reframe: [Your 3-4 sentence gentle reframing response]

User Thought: "{thought}"
"""
    try:
        cbt_resp = await client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=[
                {"role": "user", "content": cbt_prompt}
            ]
        )
        print("SUCCESS:", cbt_resp.choices[0].message.content)
    except Exception as e:
        print("ERROR:", str(e))

asyncio.run(test())
