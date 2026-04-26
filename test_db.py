import os
import asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
client = AsyncIOMotorClient(os.getenv('MONGO_URL'), serverSelectionTimeoutMS=5000)
db = client[os.getenv('DB_NAME')]

async def test():
    try:
        print("Testing DB insert...")
        result = await db.users.insert_one({'username': 'test111', 'password': '123'})
        print("Insert result:", result.inserted_id)
        
        doc = await db.users.find_one({'username': 'test111'})
        print("Find result:", doc)
    except Exception as e:
        print("Connection error:", type(e).__name__)
        print(e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
