import os
import traceback
import zipfile
import pandas as pd
import sqlite3
import json
import io
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from dotenv import load_dotenv

import joblib
import xgboost as xgb
import google.generativeai as genai

from flask import Flask, request, session, send_file, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# Logger
from logger import get_logger, request_log, prediction_log, exc_log
log = get_logger("cybershield.api")

# -----------------------------
# App Setup
# -----------------------------
app = Flask(__name__)
# Load environment variables
load_dotenv()
app.secret_key = os.getenv("SECRET_KEY", "supersecretkey")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DB_PATH = os.path.join(BASE_DIR, "users.db")

app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = True

# Allow CORS for deployed frontend and local dev
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
CORS(app, supports_credentials=True, origins=[frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"])

# The custom load_local_env was removed in favor of python-dotenv

# -----------------------------
# Load ML Models
# -----------------------------
def load_models():
    try:
        le = joblib.load(os.path.join(MODELS_DIR, "label_encoder.pkl"))
    except:
        le = None

    model = None
    for fname in ["xgboost_model.json", "xgboost_model.pkl", "xgboost_model.joblib"]:
        fpath = os.path.join(MODELS_DIR, fname)
        if os.path.exists(fpath):
            try:
                if fname.endswith(".json"):
                    m = xgb.XGBClassifier()
                    m.load_model(fpath)
                    model = m
                else:
                    model = joblib.load(fpath)
                break
            except:
                pass

    if model is None:
        class DummyModel:
            def predict(self, X):
                import numpy as np
                return np.zeros(len(X), dtype=int)

        class DummyEncoder:
            def inverse_transform(self, y):
                return ["benign"] * len(y)

        model = DummyModel()
        le = DummyEncoder()

    return le, model

label_encoder, model = load_models()

# -----------------------------
# SQLite Setup
# -----------------------------
def create_user_table():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Add email column if upgrading existing DB
    try:
        c.execute("ALTER TABLE users ADD COLUMN email TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists
    conn.commit()
    conn.close()

create_user_table()

# -----------------------------
# PING
# -----------------------------
@app.route("/ping")
def ping():
    return {"message": "backend working"}

# -----------------------------
# REGISTER
# -----------------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    email = data.get("email", "")

    hashed = generate_password_hash(password)

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("INSERT INTO users(username,password,email) VALUES (?,?,?)", (username, hashed, email))
        conn.commit()
        conn.close()
        log.info("[NEW] REGISTER ok | user=%s | email=%s", username, email)
        request_log(log, "POST", "/register", 200, username)
        return jsonify({"message": "User registered successfully"})
    except sqlite3.IntegrityError:
        log.warning("[WARN] REGISTER duplicate | user=%s", username)
        request_log(log, "POST", "/register", 400, username)
        return jsonify({"error": "Username already exists"}), 400

# -----------------------------
# LOGIN
# -----------------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username=?", (username,))
    user = c.fetchone()
    conn.close()

    if user:
        try:
            if check_password_hash(user[2], password):
                session["user"] = username
                log.info("[AUTH] LOGIN ok  | user=%s", username)
                request_log(log, "POST", "/login", 200, username)
                return jsonify({"message": "Login successful"})
        except Exception as e:
            exc_log(log, "Password hash check error", e)

    log.warning("[WARN] LOGIN fail | user=%s | bad credentials", username)
    request_log(log, "POST", "/login", 401, username)
    return jsonify({"error": "Invalid credentials"}), 401

# -----------------------------
# LOGOUT
# -----------------------------
@app.route("/logout", methods=["POST"])
def logout():
    user = session.pop("user", "anonymous")
    log.info("[OUT] LOGOUT | user=%s", user)
    request_log(log, "POST", "/logout", 200, user)
    return jsonify({"message": "Logged out"})

# -----------------------------
# PREDICT
# -----------------------------
@app.route("/predict", methods=["POST"])
def predict():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid input format. Expected a JSON object with feature parameters."}), 400

    if len(data.keys()) == 0:
        return jsonify({"error": "No input features provided."}), 400

    df = pd.DataFrame([data])

    log.debug("[IN]  PREDICT features | user=%s | keys=%s", session.get("user"), list(data.keys()))
    try:
        pred = model.predict(df)
        label = label_encoder.inverse_transform(pred)[0]
    except Exception as e:
        exc_log(log, "Prediction model error", e)
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

    recommendations = get_gemini_recommendations(label, data)

    risk_score, risk_level = get_risk(label)
    prediction_log(log, label, risk_level, risk_score, session.get("user", "?"))
    request_log(log, "POST", "/predict", 200, session.get("user", "?"))

    return jsonify({
        "prediction": label,
        "recommendations": recommendations,
        "features": data
    })


# -----------------------------
# GEMINI
# -----------------------------
def get_gemini_recommendations(label, features):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return "Monitor traffic and keep security systems updated."

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash-lite")

    prompt = f"""
    Detected traffic: {label}
    Features: {features}

    Give mitigation steps.
    """

    def _extract_text(resp):
        try:
            if hasattr(resp, "text"):
                return resp.text
            if isinstance(resp, dict):
                # common patterns
                if "candidates" in resp and resp["candidates"]:
                    c = resp["candidates"][0]
                    if isinstance(c, dict) and "content" in c:
                        return c["content"]
                    return str(c)
                for key in ("output", "outputs", "result", "content"):
                    if key in resp:
                        return str(resp[key])
            return str(resp)
        except:
            return None

    try:
        resp = model.generate_content(prompt)
        text = _extract_text(resp)
        return text or "Immediate monitoring recommended."
    except Exception:
        return "Immediate monitoring recommended."

@app.route("/chat", methods=["POST"])
def chat():
    if "user" not in session:
        return {"reply": "Please login to use the chatbot."}, 401

    data = request.json
    user_message = data.get("message", "").strip()

    if not user_message:
        return {"reply": "Please ask something."}

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return {"reply": "Gemini API key not configured on server."}, 500

    try:
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel("gemini-2.5-flash-lite")

        prompt = f"""
You are an AI cybersecurity assistant.

User question:
{user_message}

Rules:
- Answer clearly and concisely
- Give practical cybersecurity guidance
- If related to intrusion detection, networking, or attacks, explain in simple terms
"""

        response = model.generate_content(prompt)

        # extract text safely from possible response shapes
        if hasattr(response, "text"):
            reply_text = response.text.strip()
        elif isinstance(response, dict):
            if "candidates" in response and response["candidates"]:
                cand = response["candidates"][0]
                reply_text = cand.get("content") if isinstance(cand, dict) else str(cand)
            else:
                reply_text = str(response)
        else:
            reply_text = str(response)

        return {"reply": reply_text}

    except Exception as e:
        print("Gemini error:", e)
        return {"reply": "AI service temporarily unavailable."}, 500

# -----------------------------
# DOWNLOAD REPORT
# -----------------------------
RISK_SCORES = {
    "benign": (5, "Minimal"), "normal": (8, "Low"),
    "ddos": (92, "Critical"), "dos": (88, "Critical"),
    "web attack": (78, "High"), "brute force": (72, "High"),
    "botnet": (85, "Critical"), "infiltration": (80, "High"),
    "portscan": (55, "Medium"), "port scan": (55, "Medium"),
    "heartbleed": (95, "Critical"), "hulk": (80, "High"),
}

def get_risk(prediction):
    if not prediction:
        return 50, "Unknown"
    lower = prediction.lower()
    for key, (score, level) in RISK_SCORES.items():
        if key in lower:
            return score, level
    if any(w in lower for w in ["attack", "malicious", "threat"]):
        return 75, "High"
    return 10, "Low"

@app.route("/download_report", methods=["POST"])
def download_report():
    data = request.json
    prediction = data.get("prediction", "N/A")
    features = data.get("features", {})
    recommendations = data.get("recommendations", "")
    risk_score, risk_level = get_risk(prediction)

    sep = "=" * 60
    lines = [
        sep,
        "   CYBERSHIELD — INTRUSION DETECTION REPORT",
        sep,
        f"  Generated   : {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC",
        f"  Prediction  : {prediction}",
        f"  Risk Level  : {risk_level}",
        f"  Risk Score  : {risk_score} / 100",
        sep,
        "",
        "[ NETWORK FEATURES ANALYSED ]",
        "-" * 40,
    ]

    for k, v in features.items():
        lines.append(f"  {k:<25} : {v}")

    lines += [
        "",
        "[ RISK ASSESSMENT ]",
        "-" * 40,
        f"  The ML model classified this traffic as: {prediction}",
        f"  This carries a risk score of {risk_score}/100 ({risk_level} risk).",
        "",
        "[ AI SECURITY RECOMMENDATIONS ]",
        "-" * 40,
    ]

    # Format recommendations paragraph-style
    for line in (recommendations or "No recommendations available.").split("\n"):
        lines.append(f"  {line}")

    lines += [
        "",
        "[ GENERAL PREVENTION GUIDELINES ]",
        "-" * 40,
        "  1. Isolate any affected hosts immediately from the network.",
        "  2. Preserve forensic evidence: logs, pcap, memory dumps.",
        "  3. Apply all outstanding security patches.",
        "  4. Enforce multi-factor authentication on all accounts.",
        "  5. Review firewall rules and close unnecessary ports.",
        "  6. Notify your incident response team as per your IR plan.",
        "",
        sep,
        "  CyberShield — Powered by XGBoost + Google Gemini AI",
        sep,
    ]

    bio = io.BytesIO("\n".join(lines).encode())
    bio.seek(0)

    return send_file(
        bio,
        as_attachment=True,
        download_name="cybershield_report.txt",
        mimetype="text/plain"
    )

# -----------------------------
# SEND REPORT EMAIL
# -----------------------------
@app.route("/send_report_email", methods=["POST"])
def send_report_email():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    prediction = data.get("prediction", "N/A")
    features = data.get("features", {})
    recommendations = data.get("recommendations", "")
    risk_score, risk_level = get_risk(prediction)

    # Get registered email from DB
    username = session["user"]
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT email FROM users WHERE username=?", (username,))
    row = c.fetchone()
    conn.close()

    to_email = row[0] if row and row[0] else None
    if not to_email:
        return jsonify({"error": "No email registered for this account. Please update your profile."}), 400

    from_email = os.getenv("EMAIL_SENDER", "prasannavenkatesh652@gmail.com")
    app_password = os.getenv("EMAIL_PASSWORD", "")

    if not app_password:
        return jsonify({"error": "Email service not configured on server (EMAIL_PASSWORD missing)."}), 500

    # Build report text attachment
    sep = "=" * 60
    report_lines = [
        sep,
        "   CYBERSHIELD — INTRUSION DETECTION REPORT",
        sep,
        f"  Generated   : {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC",
        f"  User        : {username}",
        f"  Prediction  : {prediction}",
        f"  Risk Level  : {risk_level}",
        f"  Risk Score  : {risk_score} / 100",
        sep, "",
        "[ NETWORK FEATURES ANALYSED ]",
        "-" * 40,
    ]
    for k, v in features.items():
        report_lines.append(f"  {k:<25} : {v}")
    report_lines += [
        "", "[ AI SECURITY RECOMMENDATIONS ]", "-" * 40,
    ]
    for line in (recommendations or "No recommendations available.").split("\n"):
        report_lines.append(f"  {line}")
    report_lines += [
        "", "[ GENERAL PREVENTION GUIDELINES ]", "-" * 40,
        "  1. Isolate any affected hosts from the network immediately.",
        "  2. Preserve forensic evidence (logs, pcap, memory dumps).",
        "  3. Apply all outstanding security patches.",
        "  4. Enforce multi-factor authentication on all accounts.",
        "  5. Review firewall rules and close unnecessary ports.",
        "  6. Notify your incident response team as per your IR plan.",
        "", sep,
        "  CyberShield — Powered by XGBoost + Google Gemini AI",
        sep,
    ]
    report_text = "\n".join(report_lines)

    # Risk colour for HTML email
    risk_colours = {"Critical": "#ef4444", "High": "#f97316", "Medium": "#f59e0b", "Low": "#22c55e", "Minimal": "#22c55e"}
    risk_colour = risk_colours.get(risk_level, "#64748b")

    html_body = f"""
    <div style="font-family:'Segoe UI',sans-serif;background:#060d1a;padding:32px;color:#e2e8f0;">
      <div style="max-width:600px;margin:0 auto;background:#0b1220;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0ea5e9,#0369a1);padding:28px 32px;">
          <h1 style="margin:0;font-size:22px;color:#fff;letter-spacing:-0.5px;">🛡️ CyberShield Threat Report</h1>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Intrusion Detection Analysis — {datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')}</p>
        </div>
        <div style="padding:28px 32px;">
          <div style="background:#111827;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
            <div style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Detection Result</div>
            <div style="font-size:22px;font-weight:700;color:{risk_colour};">{prediction}</div>
            <div style="margin-top:12px;">
              <span style="background:{risk_colour}22;border:1px solid {risk_colour}44;color:{risk_colour};padding:5px 16px;border-radius:999px;font-size:12px;font-weight:600;">{risk_level} Risk — {risk_score}/100</span>
            </div>
          </div>
          <div style="background:#111827;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:20px;">
            <div style="font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">AI Recommendations</div>
            <div style="font-size:13px;color:#94a3b8;line-height:1.8;white-space:pre-wrap;">{(recommendations or 'No recommendations available.')[:800]}</div>
          </div>
          <div style="background:#111827;border:1px solid #1e293b;border-radius:12px;padding:20px;">
            <div style="font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Key Prevention Steps</div>
            {"".join(f'<div style="font-size:13px;color:#94a3b8;padding:6px 0;border-bottom:1px solid #1e293b;"><span style="color:#38bdf8;font-weight:600;">{i}.</span> {s}</div>' for i, s in enumerate(["Isolate affected hosts immediately","Preserve forensic evidence","Apply security patches","Enforce MFA on all accounts","Review firewall rules"],1))}
          </div>
          <p style="font-size:12px;color:#334155;margin-top:20px;text-align:center;">The full report is attached to this email as a .txt file.</p>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center;font-size:11px;color:#334155;">
          CyberShield · Powered by XGBoost + Google Gemini AI · Sent to {to_email}
        </div>
      </div>
    </div>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[CyberShield] Threat Report — {prediction} ({risk_level} Risk)"
        msg["From"] = from_email
        msg["To"] = to_email

        msg.attach(MIMEText(report_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        # Attach .txt report
        attachment = MIMEBase("application", "octet-stream")
        attachment.set_payload(report_text.encode())
        encoders.encode_base64(attachment)
        attachment.add_header("Content-Disposition", "attachment", filename="cybershield_report.txt")
        msg.attach(attachment)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(from_email, app_password)
            server.sendmail(from_email, to_email, msg.as_string())

        return jsonify({"message": f"Report sent successfully to {to_email}"})
    except smtplib.SMTPAuthenticationError:
        return jsonify({"error": "Email authentication failed. Check EMAIL_PASSWORD in .env (use Gmail App Password)."}), 500
    except Exception as e:
        print("Email error:", e)
        return jsonify({"error": f"Failed to send email: {str(e)}"}), 500

# -----------------------------
# DOWNLOAD ALLURE REPORT
# -----------------------------
@app.route("/download_allure_report", methods=["GET"])
def download_allure_report():
    """Zip the allure-results directory and serve it as a download."""
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    results_dir = os.path.join(os.path.dirname(__file__), "allure-results")
    report_dir  = os.path.join(os.path.dirname(__file__), "allure-report")

    # Prefer generated HTML report, fall back to raw results
    target_dir = report_dir if os.path.exists(report_dir) and os.listdir(report_dir) else results_dir

    if not os.path.exists(target_dir) or not os.listdir(target_dir):
        log.warning("Allure report requested but no results found at %s", target_dir)
        return jsonify({"error": "No allure report found. Run the test suite first: python run_tests.py"}), 404

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(target_dir):
            for fname in files:
                fpath = os.path.join(root, fname)
                arcname = os.path.relpath(fpath, os.path.dirname(target_dir))
                zf.write(fpath, arcname)

    zip_buffer.seek(0)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    log.info("Allure report downloaded by user=%s", session.get("user"))
    return send_file(
        zip_buffer,
        as_attachment=True,
        download_name=f"cybershield_allure_report_{ts}.zip",
        mimetype="application/zip"
    )

# -----------------------------
# RUN
# -----------------------------
if __name__ == "__main__":
    log.info("CyberShield backend starting on port 5000")
    app.run(debug=True, port=5000)

