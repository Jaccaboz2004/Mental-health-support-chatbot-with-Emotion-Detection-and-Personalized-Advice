import asyncio
import os
from openai import AsyncOpenAI

async def test():
    client = AsyncOpenAI(
        api_key='AIzaSyC_Rxw2816l5IU0N3c7sZFoLnhsi3qOEiA',
        base_url='https://generativelanguage.googleapis.com/v1beta/openai/'
    )
    resp = await client.chat.completions.create(
        model='gemini-1.5-flash',
        messages=[{'role': 'user', 'content': 'hello'}],
        temperature=0
    )
    print(resp.choices[0].message.content)

asyncio.run(test())
