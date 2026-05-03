import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import "./Login.css";

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef(null);
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);

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
          const dist = Math.sin((i + j) * 0.4 + t * 0.008) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(i * 60, j * 60, 1.2, 0, Math.PI * 2);
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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await api.post("/login", { username, password });
      loginUser(username);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid credentials. Please try again.");
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
            <div className="cs-hero-label">Threat Detection System</div>
            <h1 className="cs-hero-title">
              Security you can<br/><em>trust completely</em>
            </h1>
            <p className="cs-hero-sub">
              Real-time threat intelligence and enterprise-grade protection for organizations that can't afford to be wrong.
            </p>
          </div>

          <div className="cs-features">
            {[
              {
                title: "Real-Time Monitoring",
                desc: "Continuous 24/7 surveillance across your entire infrastructure",
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                )
              },
              {
                title: "Zero-Trust Architecture",
                desc: "Every access request verified — no implicit trust granted",
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                )
              },
              {
                title: "Compliance Automation",
                desc: "SOC 2, ISO 27001, and GDPR reporting out of the box",
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                )
              }
            ].map((f, i) => (
              <div className="cs-feature-item" key={i}>
                <div className="cs-feature-icon">{f.icon}</div>
                <div className="cs-feature-text">
                  <div className="cs-feature-title">{f.title}</div>
                  <div className="cs-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="cs-right">
          {mounted && (
            <div className="cs-form-inner">
              <p className="cs-step-label">Secure Access Portal</p>
              <h2 className="cs-form-title">Welcome back</h2>
              <p className="cs-form-sub">Sign in to your CyberShield account to continue.</p>

              <form onSubmit={handleLogin} autoComplete="off">

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
                      placeholder="Enter your username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      onFocus={() => setFocusedField("username")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="username"
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
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="current-password"
                    />
                    <button type="button" className="cs-toggle" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                      {showPassword
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="cs-alert error">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}

                {/* Options row */}
                <div className="cs-options">
                  <label className="cs-remember" onClick={() => setRememberMe(v => !v)}>
                    <div className={`cs-checkbox ${rememberMe ? "checked" : ""}`}>
                      {rememberMe && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <span className="cs-remember-text">Keep me signed in</span>
                  </label>
                  <button type="button" className="cs-forgot" onClick={() => {}}>Forgot password?</button>
                </div>

                <button type="submit" className="cs-submit" disabled={isLoading}>
                  {isLoading
                    ? <div className="cs-spinner" />
                    : <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                          <polyline points="10 17 15 12 10 7"/>
                          <line x1="15" y1="12" x2="3" y2="12"/>
                        </svg>
                        Sign In
                      </>
                  }
                </button>
              </form>

              <div className="cs-footer">
                Don't have an account? <a href="/register">Create one free</a>
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
          )}
        </div>

      </div>
    </>
  );
}