import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["mental_health_db"]
    test_user = "test_prompt_user_EMPTY"
    await db.conversations.delete_many({"user_id": test_user})
    
    payload = {
        "text": "Hi, I need someone to talk to.",
        "companion_type": "companion",
        "user_id": test_user,
        "language": "English"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        try:
            response = await http_client.post("http://127.0.0.1:8000/api/analyze", json=payload)
            data = response.json()
            with open("result_empty.txt", "w", encoding="utf-8") as f:
                f.write(data.get("support", "Error"))
        except Exception as e:
            with open("result_empty.txt", "w") as f:
                f.write(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(main())
