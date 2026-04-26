import asyncio
from server import signup, UserSignup

async def test_signup():
    print("Testing signup...")
    try:
        request = UserSignup(username='new_user_1234', password='password')
        response = await signup(request)
        print("Response:", response)
    except Exception as e:
        print("Error during signup:", type(e).__name__)
        print(e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_signup())
