import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import api from "../api/api";
import "./Result.css";

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap";

// ── Risk scoring logic ──────────────────────────────────────────────
const RISK_MAP = {
  benign: { score: 5, level: "Minimal", color: "#22c55e" },
  normal: { score: 8, level: "Low", color: "#22c55e" },
  ddos: { score: 92, level: "Critical", color: "#ef4444" },
  dos: { score: 88, level: "Critical", color: "#ef4444" },
  "web attack": { score: 78, level: "High", color: "#f97316" },
  "brute force": { score: 72, level: "High", color: "#f97316" },
  botnet: { score: 85, level: "Critical", color: "#ef4444" },
  infiltration: { score: 80, level: "High", color: "#f97316" },
  portscan: { score: 55, level: "Medium", color: "#f59e0b" },
  "port scan": { score: 55, level: "Medium", color: "#f59e0b" },
  heartbleed: { score: 95, level: "Critical", color: "#ef4444" },
  ftp: { score: 60, level: "Medium", color: "#f59e0b" },
  ssh: { score: 62, level: "Medium", color: "#f59e0b" },
  hulk: { score: 80, level: "High", color: "#f97316" },
  goldeneye: { score: 75, level: "High", color: "#f97316" },
  slowloris: { score: 70, level: "High", color: "#f97316" },
};

function getRisk(prediction) {
  if (!prediction) return { score: 50, level: "Unknown", color: "#64748b" };
  const lower = prediction.toLowerCase();
  for (const [key, val] of Object.entries(RISK_MAP)) {
    if (lower.includes(key)) return val;
  }
  // generic: if contains threat/attack/malicious → high
  if (lower.includes("attack") || lower.includes("malicious") || lower.includes("threat"))
    return { score: 75, level: "High", color: "#f97316" };
  return { score: 10, level: "Low", color: "#22c55e" };
}

// ── Attack-specific prevention steps ────────────────────────────────
const PREVENTION = {
  ddos: [
    { title: "Rate Limiting", desc: "Apply ingress rate limiting on all public-facing routers and load balancers." },
    { title: "Anycast Diffusion", desc: "Use Anycast network routing to spread attack traffic across multiple servers." },
    { title: "IP Blacklisting", desc: "Immediately block the source IPs at the firewall / upstream provider." },
    { title: "CDN & Scrubbing", desc: "Route traffic through a DDoS scrubbing centre or CDN (e.g., Cloudflare)." },
    { title: "Bandwidth Over-provisioning", desc: "Ensure upstream bandwidth exceeds expected peak demand." },
  ],
  dos: [
    { title: "Connection Timeout", desc: "Reduce server connection timeout thresholds to free up sockets quickly." },
    { title: "SYN Cookies", desc: "Enable TCP SYN cookie protection at the OS kernel level." },
    { title: "IDS/IPS Rules", desc: "Update intrusion prevention signatures to block known DoS patterns." },
    { title: "Load Balancing", desc: "Distribute incoming traffic across multiple backend servers." },
  ],
  "brute force": [
    { title: "Account Lockout", desc: "Lock accounts after 5 failed login attempts with exponential backoff." },
    { title: "Multi-Factor Auth", desc: "Enforce MFA on all admin and user accounts immediately." },
    { title: "CAPTCHA", desc: "Add CAPTCHA challenges to login endpoints to deter automated bots." },
    { title: "Password Policy", desc: "Enforce minimum 12-character complex passwords with breach-check." },
    { title: "IP Allowlisting", desc: "Restrict SSH/RDP access to known management IP ranges only." },
  ],
  botnet: [
    { title: "DNS Sinkholing", desc: "Redirect C&C domain traffic to a sinkhole server for analysis." },
    { title: "Endpoint Isolation", desc: "Immediately quarantine infected hosts from the network segment." },
    { title: "IOC Matching", desc: "Run IOC sweeps across all endpoints using your EDR platform." },
    { title: "Firewall Egress", desc: "Block outbound connections to known botnet C&C IP ranges." },
  ],
  "web attack": [
    { title: "WAF Deployment", desc: "Deploy a Web Application Firewall with OWASP CRS ruleset enabled." },
    { title: "Input Sanitisation", desc: "Validate and sanitise all user-supplied inputs on the server side." },
    { title: "CSP Headers", desc: "Implement strict Content-Security-Policy headers to prevent XSS." },
    { title: "Patch Applications", desc: "Apply all outstanding security patches to web frameworks and CMS." },
  ],
  portscan: [
    { title: "Firewall Hardening", desc: "Close all non-essential ports; whitelist only required services." },
    { title: "Intrusion Detection", desc: "Configure IDS to alert on sequential port access patterns." },
    { title: "Network Segmentation", desc: "Segment the network so scanned hosts cannot reach critical systems." },
    { title: "Honeypots", desc: "Deploy honeypot services on unused ports to detect and trace scanners." },
  ],
  default: [
    { title: "Isolate Affected Hosts", desc: "Immediately remove any affected systems from the network." },
    { title: "Collect Forensic Evidence", desc: "Preserve logs, packet captures, and memory dumps before remediation." },
    { title: "Patch & Harden", desc: "Apply all outstanding patches and review system hardening baselines." },
    { title: "Review Access Controls", desc: "Audit user accounts and revoke any suspicious or excessive privileges." },
    { title: "Notify Stakeholders", desc: "Follow your incident response plan and notify the relevant teams." },
  ],
};

// ── Attack full-name + description lookup ───────────────────────────
const ATTACK_INFO = {
  "ddos-rstfinflood":    { full: "DDoS — RST/FIN Flood",           desc: "Distributed Denial of Service using a flood of TCP RST and FIN packets to exhaust connection tables." },
  "ddos-icmp_flood":     { full: "DDoS — ICMP Flood",              desc: "Overwhelming the target with ICMP Echo Request (ping) packets to saturate bandwidth." },
  "ddos-synflood":       { full: "DDoS — SYN Flood",               desc: "Half-open TCP connections are sent en masse to exhaust the server's SYN queue." },
  "ddos-udpflood":       { full: "DDoS — UDP Flood",               desc: "Massive UDP datagrams sent to random ports, forcing the host to send ICMP unreachable replies." },
  "ddos-slowloris":      { full: "DDoS — Slowloris",               desc: "Low-and-slow attack that holds HTTP connections open indefinitely to exhaust the server thread pool." },
  "ddos-goldeneye":      { full: "DDoS — GoldenEye",               desc: "Layer-7 HTTP DoS tool that sends randomised keep-alive requests to overwhelm web servers." },
  "ddos-hulk":           { full: "DDoS — HULK",                    desc: "HTTP Unbearable Load King — generates unique URLs per request to bypass caching and overload servers." },
  "dos-synflood":        { full: "DoS — SYN Flood",                desc: "Single-source TCP SYN flood targeting server connection state tables." },
  "dos-tcp_flood":       { full: "DoS — TCP Flood",                desc: "High-rate TCP segment transmission causing CPU and memory exhaustion on the target." },
  "dos":                 { full: "Denial of Service (DoS)",        desc: "Attack designed to make a machine or network resource unavailable to its intended users." },
  "ddos":                { full: "Distributed Denial of Service",  desc: "Coordinated flood from multiple sources to overwhelm and take down a targeted server or network." },
  "portscan":            { full: "Port Scanning",                   desc: "Systematic probe of a host's ports to discover open services that could be exploited." },
  "port scan":           { full: "Port Scan Reconnaissance",        desc: "Network reconnaissance technique to map open TCP/UDP ports on a target host." },
  "brute force":         { full: "Brute Force Attack",             desc: "Automated trial of credential combinations to gain unauthorised access to an account or system." },
  "botnet":              { full: "Botnet C&C Communication",        desc: "Infected host communicating with a Command and Control server as part of a botnet infrastructure." },
  "web attack":          { full: "Web Application Attack",         desc: "Exploitation of vulnerabilities (SQLi, XSS, etc.) in web applications to steal data or gain access." },
  "infiltration":        { full: "Network Infiltration",            desc: "Attacker has breached the perimeter and is moving laterally inside the network." },
  "heartbleed":          { full: "Heartbleed (CVE-2014-0160)",      desc: "Critical OpenSSL buffer over-read vulnerability exposing server private keys and sensitive memory." },
  "benign":              { full: "Benign — Normal Traffic",         desc: "No attack detected. Network traffic falls within expected normal parameters." },
};

function getAttackInfo(prediction) {
  if (!prediction) return null;
  const lower = prediction.toLowerCase();
  for (const [key, val] of Object.entries(ATTACK_INFO)) {
    if (lower.includes(key)) return val;
  }
  if (lower.includes("attack") || lower.includes("malicious"))
    return { full: prediction, desc: "Suspicious traffic pattern classified as a potential cyber attack by the ML model." };
  return { full: prediction, desc: "Traffic classified by the XGBoost model based on the provided network flow parameters." };
}
function getPreventionSteps(prediction) {
  if (!prediction) return PREVENTION.default;
  const lower = prediction.toLowerCase();
  for (const key of Object.keys(PREVENTION)) {
    if (key !== "default" && lower.includes(key)) return PREVENTION[key];
  }
  if (lower.includes("attack") || lower.includes("malicious")) return PREVENTION.default;
  return [
    { title: "Continue Monitoring", desc: "Maintain regular network monitoring cadence." },
    { title: "Baseline Review", desc: "Periodically review normal traffic baselines to detect deviations." },
    { title: "Patch Schedule", desc: "Keep all systems on a regular patch management schedule." },
  ];
}

// ── Risk factors derived from features ─────────────────────────────
function getRiskFactors(features, prediction) {
  const factors = [];
  const lower = (prediction || "").toLowerCase();
  const isThreat = lower.includes("attack") || lower.includes("ddos") || lower.includes("dos") ||
    lower.includes("botnet") || lower.includes("scan") || lower.includes("brute") ||
    lower.includes("malicious") || lower.includes("web attack");

  if (features?.flow_duration > 5000)
    factors.push({ title: "Abnormally Long Flow Duration", desc: `Flow duration of ${features.flow_duration} ms exceeds safe thresholds — may indicate persistent session hijacking.`, severity: "high" });
  if (features?.Rate > 1000)
    factors.push({ title: "Extremely High Packet Rate", desc: `Rate of ${features.Rate} pps is characteristic of flooding attacks such as DDoS.`, severity: "critical" });
  if (features?.fin_flag_number > 10)
    factors.push({ title: "Excessive FIN Flags", desc: `${features.fin_flag_number} FIN flags detected — may indicate FIN flood or connection teardown attack.`, severity: "high" });
  if (features?.IAT < 5 && features?.IAT !== undefined)
    factors.push({ title: "Very Low Inter-Arrival Time", desc: `IAT of ${features.IAT} ms indicates rapid burst traffic typical of automated tools.`, severity: "medium" });
  if (features?.["Tot size"] > 100000)
    factors.push({ title: "Large Payload Size", desc: `Total payload size of ${features["Tot size"]} bytes detected — potential data exfiltration.`, severity: "high" });
  if (isThreat && factors.length === 0)
    factors.push({ title: "ML-Classified Threat Pattern", desc: `The XGBoost model identified feature combinations consistent with ${prediction} attack patterns.`, severity: "high" });
  if (!isThreat && factors.length === 0)
    factors.push({ title: "Normal Traffic Pattern", desc: "All analysed features are within expected benign traffic baselines.", severity: "low" });
  return factors;
}

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e" };

// ── SVG Risk Gauge (fixed alignment) ────────────────────────────────
function RiskGauge({ score, color }) {
  const W = 260, H = 160;
  const cx = 130, cy = 140, R = 110;
  const toRad = (d) => (d * Math.PI) / 180;
  const arcPt = (deg) => ({
    x: cx + R * Math.cos(toRad(deg)),
    y: cy - R * Math.sin(toRad(deg)),
  });
  const describeArc = (from, to) => {
    const s = arcPt(from), e = arcPt(to);
    const large = Math.abs(from - to) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  // score 0→100 maps to 180°→0°
  const needleDeg = 180 - (score / 100) * 180;
  const needleLen = R - 20;
  const nx = cx + needleLen * Math.cos(toRad(needleDeg));
  const ny = cy - needleLen * Math.sin(toRad(needleDeg));

  // Segment definitions: 5 equal 36° segments from 180→0
  const segments = [
    { from: 180, to: 144, c: "#22c55e",  label: "Low",      lDeg: 162 },
    { from: 144, to: 108, c: "#86efac",  label: "Fair",     lDeg: 126 },
    { from: 108, to: 72,  c: "#f59e0b",  label: "Medium",   lDeg: 90  },
    { from: 72,  to: 36,  c: "#f97316",  label: "High",     lDeg: 54  },
    { from: 36,  to: 0,   c: "#ef4444",  label: "Critical", lDeg: 18  },
  ];

  const labelR = R + 22;
  const labelPt = (deg) => ({
    x: cx + labelR * Math.cos(toRad(deg)),
    y: cy - labelR * Math.sin(toRad(deg)),
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ overflow: "visible" }}>
      {/* Track */}
      <path d={describeArc(180, 0)} fill="none" stroke="#1e293b" strokeWidth="16" strokeLinecap="round" />
      {/* Dimmed coloured segments */}
      {segments.map((s, i) => (
        <path key={i} d={describeArc(s.from, s.to)} fill="none" stroke={s.c} strokeWidth="16" strokeLinecap="butt" opacity="0.2" />
      ))}
      {/* Active filled arc */}
      <path d={describeArc(180, Math.max(needleDeg, 0.5))} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="7" fill={color} />
      <circle cx={cx} cy={cy} r="3.5" fill="#060d1a" />
      {/* Labels positioned outside arc */}
      {segments.map((s, i) => {
        const pt = labelPt(s.lDeg);
        return (
          <text key={i} x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fontWeight="600" fill="#475569"
            style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "DM Sans, sans-serif" }}>
            {s.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── Feature Bar Chart ───────────────────────────────────────────────
function FeatureChart({ features }) {
  const entries = Object.entries(features || {}).filter(([, v]) => typeof v === "number" && !isNaN(v));
  if (entries.length === 0) return <p style={{ color: "#475569", fontSize: 13 }}>No numeric features recorded.</p>;

  const vals = entries.map(([, v]) => Math.abs(v));
  const max = Math.max(...vals) || 1;

  const COLORS = ["#0ea5e9", "#38bdf8", "#22c55e", "#f59e0b", "#f97316", "#a78bfa", "#fb7185", "#34d399", "#60a5fa", "#fbbf24", "#e879f9", "#4ade80", "#f43f5e"];

  return (
    <div className="er-bar-list">
      {entries.slice(0, 13).map(([key, val], i) => (
        <div key={key} className="er-bar-item">
          <div className="er-bar-meta">
            <span className="er-bar-name">{key}</span>
            <span className="er-bar-val">{Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
          </div>
          <div className="er-bar-track">
            <div
              className="er-bar-fill"
              style={{ width: `${(Math.abs(val) / max) * 100}%`, background: COLORS[i % COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────
export default function Result() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const printRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  if (!state) {
    return (
      <div className="er-empty">
        <div className="er-empty-card">
          <div className="er-empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 className="er-empty-title">No Result Found</h2>
          <p className="er-empty-sub">Please run a prediction analysis from the dashboard first.</p>
          <button className="er-btn-primary" onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  const { prediction, recommendations, features } = state;
  const risk = getRisk(prediction);
  const attackInfo = getAttackInfo(prediction);
  const preventionSteps = getPreventionSteps(prediction);
  const riskFactors = getRiskFactors(features, prediction);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await api.post("/download_report", { prediction, recommendations, features }, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "cybershield_report.txt";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setEmailMsg("");
    try {
      const res = await api.post("/send_report_email", { prediction, recommendations, features });
      setEmailMsg({ type: "ok", text: res.data.message });
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to send email.";
      setEmailMsg({ type: "err", text: msg });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="er-root" ref={printRef}>
      {/* TOPBAR */}
      <div className="er-topbar">
        <div className="er-brand">
          <div className="er-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span className="er-brand-name">Cyber<span>Shield</span></span>
        </div>
        <button className="er-back-btn" onClick={() => navigate("/dashboard")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back to Dashboard
        </button>
      </div>

      <div className="er-page">

        {/* VERDICT */}
        <div className="er-verdict-card">
          <div className="er-verdict-glow" style={{ background: `radial-gradient(circle, ${risk.color}18 0%, transparent 70%)` }} />
          <div className="er-verdict-icon" style={{ background: `${risk.color}18`, border: `2px solid ${risk.color}40`, color: risk.color }}>
            {risk.score > 40 ? (
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            ) : (
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )}
          </div>
          <div className="er-verdict-pill" style={{ background: `${risk.color}18`, border: `1px solid ${risk.color}40`, color: risk.color }}>
            <span className="er-verdict-pill-dot" style={{ background: risk.color, boxShadow: `0 0 6px ${risk.color}` }} />
            {risk.level} Risk — {risk.score}/100
          </div>
          <h2 className="er-verdict-title">Threat Analysis Report</h2>
          {/* Full name + description */}
          {attackInfo && (
            <div style={{ margin: "0 auto 10px", maxWidth: 540 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: risk.color, marginBottom: 6 }}>{attackInfo.full}</p>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65 }}>{attackInfo.desc}</p>
            </div>
          )}
          <p className="er-verdict-time">Analysis completed · {new Date().toLocaleString()}</p>
        </div>

        {/* ROW 1: Gauge + Feature Chart */}
        <div className="er-two-col">
          {/* Risk Gauge */}
          <div className="er-card">
            <div className="er-card-header">
              <div className="er-card-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <div className="er-card-title">Risk Score Gauge</div>
                <div className="er-card-sub">Computed from prediction class & features</div>
              </div>
            </div>
            <div className="er-card-body" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <RiskGauge score={risk.score} color={risk.color} />
              <div className="er-risk-score-wrap">
                <div className="er-risk-score-num" style={{ color: risk.color }}>{risk.score}</div>
                <div className="er-risk-score-label">Risk Score (out of 100)</div>
                <span className="er-risk-badge" style={{ background: `${risk.color}18`, border: `1px solid ${risk.color}40`, color: risk.color }}>
                  {risk.level} Risk
                </span>
              </div>
            </div>
          </div>

          {/* Feature Bar Chart */}
          <div className="er-card">
            <div className="er-card-header">
              <div className="er-card-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <div>
                <div className="er-card-title">Feature Value Chart</div>
                <div className="er-card-sub">Input network parameters analysed</div>
              </div>
            </div>
            <div className="er-card-body">
              <FeatureChart features={features} />
            </div>
          </div>
        </div>

        {/* ROW 2: Risk Factors + Prevention */}
        <div className="er-two-col">
          {/* Risk Factors */}
          <div className="er-card">
            <div className="er-card-header">
              <div className="er-card-icon" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <div className="er-card-title">Risk Factors Identified</div>
                <div className="er-card-sub">Anomalies detected in the traffic</div>
              </div>
            </div>
            <div className="er-card-body">
              <div className="er-factor-list">
                {riskFactors.map((f, i) => (
                  <div key={i} className="er-factor-item">
                    <span className="er-factor-dot" style={{ background: SEV_COLOR[f.severity] || "#64748b", boxShadow: `0 0 6px ${SEV_COLOR[f.severity]}` }} />
                    <div className="er-factor-text">
                      <div className="er-factor-title">{f.title}</div>
                      <div className="er-factor-desc">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prevention Steps */}
          <div className="er-card">
            <div className="er-card-header">
              <div className="er-card-icon" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <div className="er-card-title">Prevention Measures</div>
                <div className="er-card-sub">Recommended mitigation steps</div>
              </div>
            </div>
            <div className="er-card-body">
              <div className="er-steps">
                {preventionSteps.map((s, i) => (
                  <div key={i} className="er-step">
                    <span className="er-step-num">{i + 1}</span>
                    <div className="er-step-text">
                      <strong>{s.title}</strong>
                      {s.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI RECOMMENDATIONS */}
        <div className="er-card" style={{ marginBottom: 0 }}>
          <div className="er-card-header">
            <div className="er-card-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <div>
              <div className="er-card-title">AI Security Recommendations</div>
              <div className="er-card-sub">Generated by Google Gemini based on detected threat</div>
            </div>
          </div>
          <div className="er-card-body">
            <div className="er-rec-content">
              {recommendations || "No specific AI recommendations available at this time."}
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ marginTop: 24 }}>
          {emailMsg && (
            <div style={{
              padding: "10px 16px", borderRadius: 8, fontSize: 13,
              background: emailMsg.type === "ok" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${emailMsg.type === "ok" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              color: emailMsg.type === "ok" ? "#86efac" : "#fca5a5",
              marginBottom: 12, textAlign: "center"
            }}>
              {emailMsg.text}
            </div>
          )}
          <div className="er-actions">
            <button className="er-btn-secondary" onClick={() => window.print()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print
            </button>
            <button className="er-btn-secondary" onClick={handleDownload} disabled={isDownloading}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {isDownloading ? "Saving…" : "Download .txt"}
            </button>
            <button className="er-btn-secondary" onClick={handleSendEmail} disabled={isSendingEmail}
              style={{ borderColor: "rgba(56,189,248,0.3)", color: "#38bdf8" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              {isSendingEmail ? "Sending…" : "Email Report"}
            </button>
            <button className="er-btn-primary" onClick={() => navigate("/dashboard")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              New Analysis
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}