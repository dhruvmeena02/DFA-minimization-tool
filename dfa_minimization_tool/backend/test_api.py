import json
import urllib.request
import urllib.error

data = {
    'input_mode': 'text',
    'action': 'minimize',
    'data': {
        'states': 'q0,q1,q2',
        'alphabet': '0,1',
        'transitions': 'q0,0=q1\nq0,1=q2\nq1,0=q2\nq1,1=q0\nq2,0=q2\nq2,1=q2',
        'start_state': 'q0',
        'final_states': 'q2'
    }
}

json_data = json.dumps(data).encode('utf-8')
req = urllib.request.Request(
    'http://localhost:5000/api/process',
    data=json_data,
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req) as response:
        result = json.load(response)
        print("SUCCESS!")
        print(json.dumps(result, indent=2)[:500])
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} {e.reason}")
    print(f"Response headers: {dict(e.headers)}")
    if e.fp:
        error_body = e.fp.read().decode('utf-8')
        print(f"Response body: {error_body[:200]}")
except Exception as e:
    print(f"Error: {e}")
