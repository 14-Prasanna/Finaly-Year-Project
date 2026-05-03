import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Chatbot from "./Chatbot";
import "./Dashboard.css";

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap";

const FIELDS = [
  {
    group: "Basic Flow Metrics",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    fields: [
      { name: "flow_duration", label: "Flow Duration", placeholder: "e.g. 1024" },
      { name: "Header_Length", label: "Header Length", placeholder: "e.g. 40" },
      { name: "Protocol Type", label: "Protocol Type", placeholder: "e.g. 6" },
      { name: "Duration", label: "Duration", placeholder: "e.g. 2048" },
    ],
  },
  {
    group: "Rate Analysis",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    fields: [
      { name: "Rate", label: "Rate", placeholder: "e.g. 500" },
      { name: "Srate", label: "Source Rate", placeholder: "e.g. 250" },
    ],
  },
  {
    group: "TCP Flags & Statistics",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
    ),
    fields: [
      { name: "fin_flag_number", label: "FIN Flag Number", placeholder: "e.g. 0" },
      { name: "Std", label: "Standard Deviation", placeholder: "e.g. 1.23" },
    ],
  },
  {
    group: "Size & Timing Metrics",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    fields: [
      { name: "Tot size", label: "Total Size", placeholder: "e.g. 4096" },
      { name: "IAT", label: "Inter-Arrival Time", placeholder: "e.g. 100" },
    ],
  },
  {
    group: "Advanced Metrics",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    fields: [
      { name: "Magnitue", label: "Magnitude", placeholder: "e.g. 3.14" },
      { name: "Radius", label: "Radius", placeholder: "e.g. 2.71" },
      { name: "Weight", label: "Weight", placeholder: "e.g. 1.0" },
    ],
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: parseFloat(e.target.value) });
  };

  const handlePredict = async () => {
    if (Object.keys(formData).length === 0) {
      alert("Please enter at least some network parameters");
      return;
    }
    setIsPredicting(true);
    try {
      const res = await api.post("/predict", formData);
      navigate("/result", { state: res.data });
    } catch (err) {
      alert("Prediction failed");
    } finally {
      setIsPredicting(false);
    }
  };

  const filledCount = Object.keys(formData).filter(k => !isNaN(formData[k])).length;
  const totalFields = FIELDS.reduce((a, g) => a + g.fields.length, 0);
  const completionPct = Math.round((filledCount / totalFields) * 100);

  return (
    <>
<div className="db-root">

        {/* ── TOPBAR ── */}
        <div className="db-topbar">
          <div className="db-brand">
            <div className="db-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span className="db-brand-name">Cyber<span>Shield</span></span>
          </div>

          <div className="db-topbar-right">
            <div className="db-badge">System Active</div>
            <button className="db-logout" onClick={() => navigate("/")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>

        {/* ── PAGE ── */}
        <div className="db-page">

          {/* LEFT COLUMN */}
          <div>
            {/* Stat Strip */}
            <div className="db-stats-strip">
              <div className="db-stat-card">
                <div className="db-stat-icon" style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)", color: "#38bdf8" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div>
                  <div className="db-stat-num">{filledCount}<span style={{fontSize:14,color:"#475569"}}>/{totalFields}</span></div>
                  <div className="db-stat-label">Fields Filled</div>
                </div>
              </div>
              <div className="db-stat-card">
                <div className="db-stat-icon" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", color: "#22c55e" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div>
                  <div className="db-stat-num">{completionPct}<span style={{fontSize:14,color:"#475569"}}>%</span></div>
                  <div className="db-stat-label">Completion</div>
                </div>
              </div>
              <div className="db-stat-card">
                <div className="db-stat-icon" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div>
                  <div className="db-stat-num" style={{fontSize:16, paddingTop:4}}>{new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
                  <div className="db-stat-label">Session Time</div>
                </div>
              </div>
            </div>

            {/* Form Panel */}
            <div className="db-form-panel">
              <div className="db-form-header">
                <div className="db-form-header-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div>
                  <div className="db-form-title">Network Flow Parameters</div>
                </div>
                <span className="db-form-sub">Fill fields to run prediction</span>
              </div>

              <div className="db-form-body">
                {FIELDS.map((group) => (
                  <div className="db-group" key={group.group}>
                    <div className="db-group-label">
                      <div className="db-group-label-icon">{group.icon}</div>
                      {group.group}
                    </div>
                    <div className="db-input-grid">
                      {group.fields.map((f) => (
                        <div key={f.name}>
                          <label className="db-field-label">{f.label}</label>
                          <input
                            className={`db-input ${!isNaN(formData[f.name]) && formData[f.name] !== undefined ? "filled" : ""}`}
                            name={f.name}
                            type="number"
                            placeholder={f.placeholder}
                            onChange={handleChange}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="db-progress-wrap">
                <div className="db-progress-header">
                  <span className="db-progress-label">Form completion</span>
                  <span className="db-progress-pct">{completionPct}%</span>
                </div>
                <div className="db-progress-track">
                  <div className="db-progress-fill" style={{ width: `${completionPct}%` }} />
                </div>
              </div>

              {/* Predict */}
              <div className="db-predict-wrap">
                <p className="db-predict-hint">
                  Fill in available parameters and run the ML prediction engine to classify network traffic.
                </p>
                <button className="db-predict-btn" onClick={handlePredict} disabled={isPredicting}>
                  {isPredicting ? (
                    <div className="db-spinner" />
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      Run Prediction
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="db-sidebar">

            {/* Tips Card */}
            <div className="db-sidebar-card">
              <div className="db-sidebar-header">
                <div>
                  <div className="db-sidebar-title">Analysis Tips</div>
                  <div className="db-sidebar-sub">Improve prediction accuracy</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div className="db-tips">
                {[
                  "More fields filled leads to higher prediction confidence.",
                  "Flow duration and rate are the most critical indicators.",
                  "TCP flags help distinguish DDoS from normal traffic.",
                  "IAT (Inter-Arrival Time) reveals burst attack patterns.",
                ].map((tip, i) => (
                  <div className="db-tip" key={i}>
                    <div className="db-tip-dot" />
                    <div className="db-tip-text">{tip}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chatbot Card */}
            <div className="db-sidebar-card" style={{ flex: 1 }}>
              <div className="db-sidebar-header">
                <div>
                  <div className="db-sidebar-title">Security Assistant</div>
                  <div className="db-sidebar-sub">AI-powered threat analysis</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#22c55e" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
                  Online
                </div>
              </div>
              <div className="db-chatbot-body">
                <Chatbot embedded />
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}