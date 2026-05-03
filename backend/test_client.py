from app import app
import json

with app.test_client() as c:
    # -----------------------------
    # REGISTER USER
    # -----------------------------
    rv = c.post(
        "/register",
        json={
            "username": "tcuser",
            "password": "tcpass"
        }
    )
    print("REGISTER STATUS:", rv.status_code)
    print(rv.get_json())

    # -----------------------------
    # LOGIN USER
    # -----------------------------
    rv = c.post(
        "/login",
        json={
            "username": "tcuser",
            "password": "tcpass"
        }
    )
    print("\nLOGIN STATUS:", rv.status_code)
    print(rv.get_json())

    # -----------------------------
    # PREDICTION DATA
    # (MUST MATCH MODEL FEATURES)
    # -----------------------------
    predict_data = {
        "flow_duration": 1,
        "Header_Length": 1,
        "Protocol Type": 1,
        "Duration": 1,
        "Rate": 1,
        "Srate": 1,
        "fin_flag_number": 1,
        "Std": 1,
        "Tot size": 1,
        "IAT": 1,
        "Magnitue": 1,
        "Radius": 1,
        "Weight": 1
    }

    rv = c.post(
        "/predict",
        json=predict_data
    )

    print("\nPREDICT STATUS:", rv.status_code)
    response_json = rv.get_json()
    print(json.dumps(response_json, indent=2))

    # -----------------------------
    # DOWNLOAD REPORT
    # -----------------------------
    rv = c.post(
        "/download_report",
        json=response_json
    )

    print("\nDOWNLOAD STATUS:", rv.status_code)
    print("Downloaded file size:", len(rv.data))
