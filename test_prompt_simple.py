import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
import datetime

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["mental_health_db"]
    test_user = "test_prompt_user_123"
    await db.conversations.delete_many({"user_id": test_user})
    await db.conversations.insert_one({
        "user_id": test_user,
        "companion": "nutritionist",
        "user_message": "I've been feeling extremely stressed about my exams lately and all I've been eating is junk food.",
        "emotion": "stressed",
        "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat()
    })
    
    payload = {
        "text": "Hi, I just woke up and I'm starting my day.",
        "companion_type": "nutritionist",
        "user_id": test_user,
        "language": "English"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        try:
            response = await http_client.post("http://127.0.0.1:8000/api/analyze", json=payload)
            data = response.json()
            with open("result_out.txt", "w", encoding="utf-8") as f:
                f.write(data.get("support", "Error"))
        except Exception as e:
            with open("result_out.txt", "w") as f:
                f.write(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(main())
