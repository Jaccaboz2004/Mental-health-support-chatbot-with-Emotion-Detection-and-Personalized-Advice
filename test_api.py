import urllib.request
import urllib.error
import json

url = "http://127.0.0.1:8000/api/analyze"
payload = {"text": "I am feeling very tired and stressed", "companion_type": "companion"}
data = json.dumps(payload).encode('utf-8')
headers = {"Content-Type": "application/json"}

req = urllib.request.Request(url, data=data, headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        with open("output.json", "w") as f:
            f.write(resp.read().decode('utf-8'))
        print("STATUS:", resp.status)
except urllib.error.HTTPError as e:
    print("ERROR:", e.read().decode('utf-8'))
except Exception as e:
    print("FATAL ERROR:", e)
