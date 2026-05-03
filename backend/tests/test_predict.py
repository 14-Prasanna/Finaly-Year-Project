import requests
import json

# Use session to preserve cookies (Flask session auth)
s = requests.Session()
base = "http://127.0.0.1:5000"

# -----------------------------
# REGISTER (JSON)
# -----------------------------
try:
    r = s.post(
        base + "/register",
        json={
            "username": "autotest",
            "password": "autotest123"
        }
    )
    print("REGISTER:", r.status_code, r.text)
except Exception as e:
    print("REGISTER ERROR:", e)

# -----------------------------
# LOGIN (JSON)
# -----------------------------
try:
    r = s.post(
        base + "/login",
        json={
            "username": "autotest",
            "password": "autotest123"
        }
    )
    print("LOGIN:", r.status_code, r.text)
except Exception as e:
    print("LOGIN ERROR:", e)

# -----------------------------
# PREDICT (JSON)
# MUST MATCH MODEL FEATURE NAMES
# -----------------------------
predict_data = {
    "flow_duration": 0,
    "Header_Length": 54,
    "Protocol Type": 6,
    "Duration": 64,
    "Rate": 0.329807,
    "Srate": 0.329807,
    "fin_flag_number": 1,
    "Std": 0,
    "Tot size": 54,
    "IAT": 83343831.92,
    "Magnitue": 10.392304,
    "Radius": 0,
    "Weight": 141.55
}

try:
    r = s.post(
        base + "/predict",
        json=predict_data
    )
    print("PREDICT STATUS:", r.status_code)
    print(json.dumps(r.json(), indent=2))
except Exception as e:
    print("PREDICT ERROR:", e)

# -----------------------------
# DOWNLOAD REPORT
# -----------------------------
try:
    report_payload = r.json()
    r2 = s.post(
        base + "/download_report",
        json=report_payload
    )
    print("DOWNLOAD STATUS:", r2.status_code)
    print("REPORT SIZE:", len(r2.content))
except Exception as e:
    print("DOWNLOAD ERROR:", e)
