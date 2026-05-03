"""
CyberShield — Allure + Pytest Test Suite (Flask Test Client)
=============================================================
Run:  python run_tests.py
View: open reports/cybershield_test_*.html
"""
import pytest
import allure
import json

# ══════════════════════════════════════════════════════════════════════════════
# SUITE 1: Health & Authentication
# ══════════════════════════════════════════════════════════════════════════════
@allure.suite("1. Health & Authentication")
class TestHealthAuth:

    @allure.title("Ping - Backend health check")
    @allure.description("GET /ping must return 200 and a working message.")
    @allure.severity(allure.severity_level.BLOCKER)
    def test_ping(self, client):
        with allure.step("Send GET /ping"):
            r = client.get("/ping")
        with allure.step("Assert status 200"):
            assert r.status_code == 200
        with allure.step("Assert response body contains 'working'"):
            data = json.loads(r.data)
            assert "working" in data.get("message", "").lower()
        allure.attach(r.data.decode(), name="Response",
                      attachment_type=allure.attachment_type.JSON)

    @allure.title("Register - New user registration")
    @allure.description("POST /register with valid credentials returns 200 or 400 if user exists.")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_register(self, client):
        payload = {"username": "allure_reg_user", "password": "Test@1234", "email": "reg@cs.local"}
        with allure.step("Send POST /register"):
            r = client.post("/register", json=payload)
        allure.attach(json.dumps(payload, indent=2), name="Request",
                      attachment_type=allure.attachment_type.JSON)
        allure.attach(r.data.decode(), name="Response",
                      attachment_type=allure.attachment_type.JSON)
        with allure.step("Assert 200 or 400 (already exists)"):
            assert r.status_code in (200, 400)

    @allure.title("Login - Valid credentials")
    @allure.description("POST /login with correct credentials returns 200.")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_login_valid(self, client):
        client.post("/register", json={
            "username": "login_valid_user", "password": "Test@1234", "email": "v@cs.local"
        })
        payload = {"username": "login_valid_user", "password": "Test@1234"}
        with allure.step("Send POST /login"):
            r = client.post("/login", json=payload)
        allure.attach(r.data.decode(), name="Response",
                      attachment_type=allure.attachment_type.JSON)
        with allure.step("Assert 200"):
            assert r.status_code == 200

    @allure.title("Login - Invalid credentials")
    @allure.description("POST /login with wrong password returns 401.")
    @allure.severity(allure.severity_level.NORMAL)
    def test_login_invalid(self, client):
        payload = {"username": "nobody_user", "password": "WrongPass999"}
        with allure.step("Send POST /login with bad credentials"):
            r = client.post("/login", json=payload)
        allure.attach(r.data.decode(), name="Response",
                      attachment_type=allure.attachment_type.JSON)
        with allure.step("Assert 401"):
            assert r.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 2: Prediction - High Risk (DDoS)
# ══════════════════════════════════════════════════════════════════════════════
@allure.suite("2. Prediction - High Risk")
class TestPredictionHighRisk:

    HIGH_RISK = {
        "flow_duration": 8500, "Header_Length": 40, "Protocol Type": 6,
        "Duration": 9000, "Rate": 5800, "Srate": 2900, "fin_flag_number": 25,
        "Std": 0.04, "Tot size": 320000, "IAT": 2,
        "Magnitue": 18.5, "Radius": 9.2, "Weight": 3.1,
    }

    @allure.title("Predict - High Risk DDoS parameters")
    @allure.description("POST /predict with DDoS-like values returns a threat classification.")
    @allure.severity(allure.severity_level.CRITICAL)
    @allure.tag("prediction", "ddos", "high-risk")
    def test_predict_high_risk(self, auth_client):
        with allure.step("POST /predict with DDoS features"):
            r = auth_client.post("/predict", json=self.HIGH_RISK)
        allure.attach(json.dumps(self.HIGH_RISK, indent=2), name="Input Features",
                      attachment_type=allure.attachment_type.JSON)
        allure.attach(r.data.decode(), name="Prediction Response",
                      attachment_type=allure.attachment_type.JSON)
        with allure.step("Assert 200"):
            assert r.status_code == 200, f"Got {r.status_code}: {r.data.decode()}"
        with allure.step("Assert prediction field present"):
            data = json.loads(r.data)
            assert "prediction" in data
            assert len(data["prediction"]) > 0

    @allure.title("Predict - High Risk includes recommendations")
    @allure.severity(allure.severity_level.NORMAL)
    @allure.tag("prediction", "recommendations")
    def test_predict_high_risk_has_recommendations(self, auth_client):
        with allure.step("POST /predict with DDoS features"):
            r = auth_client.post("/predict", json=self.HIGH_RISK)
        with allure.step("Assert recommendations present"):
            data = json.loads(r.data)
            assert "recommendations" in data


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 3: Prediction - Medium Risk (Port Scan)
# ══════════════════════════════════════════════════════════════════════════════
@allure.suite("3. Prediction - Medium Risk")
class TestPredictionMediumRisk:

    MEDIUM_RISK = {
        "flow_duration": 1200, "Header_Length": 20, "Protocol Type": 6,
        "Duration": 1500, "Rate": 320, "Srate": 160, "fin_flag_number": 4,
        "Std": 1.10, "Tot size": 3200, "IAT": 45,
        "Magnitue": 5.2, "Radius": 2.6, "Weight": 1.0,
    }

    @allure.title("Predict - Medium Risk Port Scan parameters")
    @allure.description("POST /predict with port scan values returns a classification.")
    @allure.severity(allure.severity_level.NORMAL)
    @allure.tag("prediction", "portscan", "medium-risk")
    def test_predict_medium_risk(self, auth_client):
        with allure.step("POST /predict with Port Scan features"):
            r = auth_client.post("/predict", json=self.MEDIUM_RISK)
        allure.attach(json.dumps(self.MEDIUM_RISK, indent=2), name="Input Features",
                      attachment_type=allure.attachment_type.JSON)
        allure.attach(r.data.decode(), name="Prediction Response",
                      attachment_type=allure.attachment_type.JSON)
        with allure.step("Assert 200"):
            assert r.status_code == 200, f"Got {r.status_code}: {r.data.decode()}"
        with allure.step("Assert prediction field present"):
            data = json.loads(r.data)
            assert "prediction" in data


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 4: Prediction - Normal / Benign
# ══════════════════════════════════════════════════════════════════════════════
@allure.suite("4. Prediction - Normal Traffic")
class TestPredictionNormal:

    NORMAL = {
        "flow_duration": 0, "Header_Length": 54, "Protocol Type": 6,
        "Duration": 64, "Rate": 0.329807, "Srate": 0.329807, "fin_flag_number": 1,
        "Std": 0, "Tot size": 54, "IAT": 83343831.92,
        "Magnitue": 10.392304, "Radius": 0, "Weight": 141.55,
    }

    @allure.title("Predict - Normal benign traffic")
    @allure.description("POST /predict with benign values returns a prediction.")
    @allure.severity(allure.severity_level.NORMAL)
    @allure.tag("prediction", "benign", "normal")
    def test_predict_normal(self, auth_client):
        with allure.step("POST /predict with benign features"):
            r = auth_client.post("/predict", json=self.NORMAL)
        allure.attach(json.dumps(self.NORMAL, indent=2), name="Input Features",
                      attachment_type=allure.attachment_type.JSON)
        allure.attach(r.data.decode(), name="Prediction Response",
                      attachment_type=allure.attachment_type.JSON)
        with allure.step("Assert 200"):
            assert r.status_code == 200, f"Got {r.status_code}: {r.data.decode()}"
        with allure.step("Assert prediction field present"):
            assert "prediction" in json.loads(r.data)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 5: Input Validation
# ══════════════════════════════════════════════════════════════════════════════
@allure.suite("5. Input Validation")
class TestInputValidation:

    @allure.title("Predict - Empty JSON body returns 400")
    @allure.severity(allure.severity_level.NORMAL)
    @allure.tag("validation", "negative-test")
    def test_predict_empty_body(self, auth_client):
        with allure.step("POST /predict with empty JSON"):
            r = auth_client.post("/predict", json={})
        allure.attach(r.data.decode(), name="Response",
                      attachment_type=allure.attachment_type.JSON)
        with allure.step("Assert 400"):
            assert r.status_code == 400, f"Got {r.status_code}: {r.data.decode()}"

    @allure.title("Predict - No JSON content-type returns error")
    @allure.severity(allure.severity_level.MINOR)
    @allure.tag("validation", "negative-test")
    def test_predict_no_json(self, auth_client):
        with allure.step("POST /predict with plain text body"):
            r = auth_client.post("/predict", data="not json",
                                 content_type="text/plain")
        with allure.step("Assert 400 or 415"):
            assert r.status_code in (400, 415), f"Got {r.status_code}: {r.data.decode()}"


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 6: Report Download
# ══════════════════════════════════════════════════════════════════════════════
@allure.suite("6. Report Download")
class TestReportDownload:

    @allure.title("Download Report - Valid prediction payload")
    @allure.description("POST /download_report returns a non-empty .txt file.")
    @allure.severity(allure.severity_level.NORMAL)
    @allure.tag("report", "download")
    def test_download_report(self, auth_client):
        payload = {
            "prediction": "DDoS-RSTFINFlood",
            "recommendations": "Block source IPs and enable rate limiting.",
            "features": {"Rate": 5800, "fin_flag_number": 25}
        }
        with allure.step("POST /download_report"):
            r = auth_client.post("/download_report", json=payload)
        preview = r.data[:500].decode(errors="replace")
        allure.attach(preview, name="Report Preview",
                      attachment_type=allure.attachment_type.TEXT)
        with allure.step("Assert 200"):
            assert r.status_code == 200, f"Got {r.status_code}: {r.data.decode()}"
        with allure.step("Assert report is non-empty"):
            assert len(r.data) > 100
        with allure.step("Assert prediction label in report"):
            assert b"DDoS-RSTFINFlood" in r.data
