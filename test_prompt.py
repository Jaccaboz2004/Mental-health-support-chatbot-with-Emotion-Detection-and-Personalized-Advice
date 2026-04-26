import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
import datetime

async def main():
    print("1. Setting up mock history in database...")
    # Connect to local MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["mental_health_db"]
    
    test_user = "test_prompt_user_123"
    
    # Clean up old data for this user
    await db.conversations.delete_many({"user_id": test_user})
    
    # Insert a fake historical conversation from yesterday
    await db.conversations.insert_one({
        "user_id": test_user,
        "companion": "nutritionist",
        "user_message": "I've been feeling extremely stressed about my exams lately and all I've been eating is junk food.",
        "emotion": "stressed",
        "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat()
    })
    
    print("2. History inserted. Now making a new request to the API...")
    
    # Make request to the local backend
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
            
            print("\n" + "="*50)
            print("AI RESPONSE:")
            print("="*50)
            print(data.get("support", "No support text returned"))
            print("="*50)
            
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
