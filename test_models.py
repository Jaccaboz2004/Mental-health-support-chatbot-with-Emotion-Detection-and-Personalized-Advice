import urllib.request
import urllib.error
import json

def test_key(model):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=AIzaSyDCkNeZrHvBeU7_riuVrh5_9wEM0iPwYe0"
    req = urllib.request.Request(url, data=json.dumps({"contents":[{"parts":[{"text":"hello"}]}]}).encode("utf-8"), headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req)
        print(f"Success for {model}")
    except urllib.error.HTTPError as e:
        print(f"Error for {model}: {e.read().decode('utf-8')}")

test_key("gemini-1.5-flash")
test_key("gemini-2.5-flash")
test_key("gemini-1.0-pro")
test_key("gemini-2.0-flash")
