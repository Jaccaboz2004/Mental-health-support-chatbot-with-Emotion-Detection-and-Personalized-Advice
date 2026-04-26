import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

try:
    client = OpenAI(
        api_key=api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )
    resp = client.chat.completions.create(
        model="gemini-1.5-flash",
        messages=[{"role": "user", "content": "hello"}],
    )
    print("SUCCESS")
    print(resp.choices[0].message.content)
except Exception as e:
    with open('test_direct_out_utf8.txt', 'w', encoding='utf-8') as f:
        f.write(f"FAILED: {e}")
