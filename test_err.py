from google import genai

client = genai.Client(api_key='AIzaSyC_Rxw2816l5IU0N3c7sZFoLnhsi3qOEiA')
try:
    response = client.models.generate_content(model='gemini-2.0-flash', contents='hello')
    print(response.text)
except Exception as e:
    print(str(e))
