import requests

response = requests.post("http://127.0.0.1:8000/api/cbt-reframe", json={
    "thought": "i call my friend for 3 times they didn't response they block my number or they hate me"
})

print(response.status_code)
print(response.json())
