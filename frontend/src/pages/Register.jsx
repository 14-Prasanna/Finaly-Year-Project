import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "./Register.css";

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);

    // Subtle animated grid canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = Math.ceil(canvas.width / 60) + 1;
      const rows = Math.ceil(canvas.height / 60) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * 60;
          const y = j * 60;
          const dist = Math.sin((i + j) * 0.4 + t * 0.008) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(14, 165, 233, ${0.06 + dist * 0.09})`;
          ctx.fill();
        }
      }
      t++;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      document.head.removeChild(link);
    };
  }, []);

  const getPasswordStrength = () => {
    if (!password) return { label: "", score: 0, color: "transparent" };
    const hasUpper = /[A-Z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const score =
      (password.length >= 8 ? 1 : 0) +
      (hasUpper ? 1 : 0) +
      (hasNum ? 1 : 0) +
      (hasSpecial ? 1 : 0);
    if (score <= 1) return { label: "Weak", score: 1, color: "#ef4444" };
    if (score === 2) return { label: "Fair", score: 2, color: "#f59e0b" };
    if (score === 3) return { label: "Good", score: 3, color: "#22c55e" };
    return { label: "Strong", score: 4, color: "#0ea5e9" };
  };

  const strength = getPasswordStrength();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !password || !email) { setError("Please fill in all fields including email"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email address"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/register", { username, password, email });
      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError("Registration failed. Username may already exist.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
<div className="cs-root">

        {/* ── LEFT PANEL ── */}
        <div className="cs-left">
          <canvas ref={canvasRef} className="cs-canvas" />
          <div className="cs-left-overlay" />

          <div className="cs-brand">
            <div className="cs-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span className="cs-brand-name">Cyber<span>Shield</span></span>
          </div>

          <div className="cs-hero">
            <div className="cs-hero-label">Enterprise Security Platform</div>
            <h1 className="cs-hero-title">
              Defend what<br/><em>matters most</em>
            </h1>
            <p className="cs-hero-sub">
              Unified threat intelligence, real-time monitoring, and compliance automation — purpose-built for enterprise security teams.
            </p>
          </div>

          <div className="cs-stats">
            <div className="cs-stat">
              <div className="cs-stat-num">99<span>.9%</span></div>
              <div className="cs-stat-label">Uptime SLA</div>
            </div>
            <div className="cs-stat">
              <div className="cs-stat-num">2M<span>+</span></div>
              <div className="cs-stat-label">Threats Blocked</div>
            </div>
            <div className="cs-stat">
              <div className="cs-stat-num">ISO<span> 27001</span></div>
              <div className="cs-stat-label">Certified</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="cs-right">
          <div className="cs-form-inner">
              <p className="cs-step-label">Get started — it's free</p>
              <h2 className="cs-form-title">Create your account</h2>
              <p className="cs-form-sub">Start your 14-day free trial. No credit card required.</p>

              <form onSubmit={handleRegister} autoComplete="off">

                {/* Username */}
                <div className="cs-field">
                  <label className="cs-field-label">Username</label>
                  <div className={`cs-input-wrap ${focusedField === "username" ? "focused" : ""}`}>
                    <span className="cs-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </span>
                    <input
                      className="cs-input"
                      type="text"
                      placeholder="e.g. john.doe"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      onFocus={() => setFocusedField("username")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="cs-field">
                  <label className="cs-field-label">Email Address</label>
                  <div className={`cs-input-wrap ${focusedField === "email" ? "focused" : ""}`}>
                    <span className="cs-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </span>
                    <input
                      className="cs-input"
                      type="email"
                      placeholder="e.g. you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="cs-field">
                  <label className="cs-field-label">Password</label>
                  <div className={`cs-input-wrap ${focusedField === "password" ? "focused" : ""}`}>
                    <span className="cs-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>
                    <input
                      className="cs-input has-toggle"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="new-password"
                    />
                    <button type="button" className="cs-toggle" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                      {showPassword
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  {password && (
                    <div className="cs-strength">
                      <div className="cs-strength-bars">
                        {[1,2,3,4].map(i => (
                          <div
                            key={i}
                            className="cs-strength-bar"
                            style={{ background: i <= strength.score ? strength.color : undefined }}
                          />
                        ))}
                      </div>
                      <span className="cs-strength-text" style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="cs-field">
                  <label className="cs-field-label">Confirm Password</label>
                  <div className={`cs-input-wrap ${focusedField === "confirm" ? "focused" : ""}`}>
                    <span className="cs-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </span>
                    <input
                      className="cs-input has-toggle"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField("confirm")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="new-password"
                    />
                    <button type="button" className="cs-toggle" onClick={() => setShowConfirmPassword(v => !v)} tabIndex={-1}>
                      {showConfirmPassword
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  {confirmPassword && (
                    <div className="cs-match">
                      <div className="cs-match-dot" style={{ background: password === confirmPassword ? "#22c55e" : "#ef4444" }} />
                      <span style={{ color: password === confirmPassword ? "#86efac" : "#fca5a5", fontSize: 12 }}>
                        {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
                      </span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="cs-alert error">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}
                {success && (
                  <div className="cs-alert success">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {success}
                  </div>
                )}

                <button type="submit" className="cs-submit" disabled={isLoading}>
                  {isLoading
                    ? <div className="cs-spinner" />
                    : <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="8.5" cy="7" r="4"/>
                          <line x1="20" y1="8" x2="20" y2="14"/>
                          <line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                        Create Account
                      </>
                  }
                </button>
              </form>

              <div className="cs-footer">
                Already have an account? <a href="/">Sign in</a>
              </div>

              <div className="cs-trust">
                <div className="cs-trust-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  SOC 2 Type II
                </div>
                <div className="cs-trust-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  256-bit AES
                </div>
                <div className="cs-trust-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  GDPR Compliant
                </div>
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
