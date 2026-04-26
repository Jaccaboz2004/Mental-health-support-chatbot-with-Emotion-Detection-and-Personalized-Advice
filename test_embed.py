import asyncio
import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

async def test():
    client = AsyncOpenAI(
        api_key=api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )
    try:
        embed_resp = await client.embeddings.create(
            input="hello",
            model="text-embedding-004"
        )
        print("Embedding Success")
    except Exception as e:
        print(f"Embedding Failed: {e}")

asyncio.run(test())
