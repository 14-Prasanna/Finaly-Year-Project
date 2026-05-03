import React, { useState, useRef, useEffect } from "react";
import api from "../api/api";

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap";

export default function Chatbot({ embedded = false }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hello. I'm your AI security analyst. Ask me about network threats, attack patterns, or how to interpret your results.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/chat", { message: input });
      const replyText = res?.data?.reply ?? String(res?.data ?? "No response from AI");
      setMessages((prev) => [...prev, { role: "bot", text: replyText }]);
    } catch (err) {
      const text = err?.response?.data?.reply || err?.response?.data?.error || "⚠️ AI service unavailable";
      setMessages((prev) => [...prev, { role: "bot", text }]);
    } finally {
      setLoading(false);
    }
  };

  const renderChatUI = () => (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: embedded ? "420px" : "100%",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        .cs-msg-list::-webkit-scrollbar { width: 4px; }
        .cs-msg-list::-webkit-scrollbar-track { background: transparent; }
        .cs-msg-list::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        @keyframes cs-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes cs-msg-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cs-msg { animation: cs-msg-in 0.2s ease; }
        .cs-send-btn:hover { background: #0369a1 !important; }
        .cs-input-field:focus { border-color: #0ea5e9 !important; box-shadow: 0 0 0 3px rgba(14,165,233,0.1) !important; }
      `}</style>

      {/* Messages */}
      <div
        className="cs-msg-list"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 0",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className="cs-msg"
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              gap: "8px",
              alignItems: "flex-end",
            }}
          >
            {m.role === "bot" && (
              <div style={{
                width: 28, height: 28,
                borderRadius: "50%",
                background: "rgba(14,165,233,0.1)",
                border: "1px solid rgba(14,165,233,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "#38bdf8",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
            )}
            <div style={{
              maxWidth: "78%",
              padding: "10px 14px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.role === "user"
                ? "linear-gradient(135deg, #0ea5e9, #0369a1)"
                : "#111827",
              border: m.role === "user" ? "none" : "1px solid #1e293b",
              color: m.role === "user" ? "white" : "#94a3b8",
              fontSize: "13px",
              lineHeight: "1.55",
              wordBreak: "break-word",
            }}>
              {m.text}
            </div>
            {m.role === "user" && (
              <div style={{
                width: 28, height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "white",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="cs-msg" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(14,165,233,0.1)",
              border: "1px solid rgba(14,165,233,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#38bdf8",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div style={{
              padding: "12px 16px",
              background: "#111827",
              border: "1px solid #1e293b",
              borderRadius: "16px 16px 16px 4px",
              display: "flex",
              gap: 5,
              alignItems: "center",
            }}>
              {[0, 0.15, 0.3].map((delay, i) => (
                <div key={i} style={{
                  width: 6, height: 6,
                  borderRadius: "50%",
                  background: "#0ea5e9",
                  animation: `cs-bounce 1.2s infinite ease-in-out both`,
                  animationDelay: `${delay}s`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
        paddingTop: "12px",
        borderTop: "1px solid #1e293b",
        marginTop: "4px",
      }}>
        <input
          className="cs-input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask about security threats..."
          style={{
            flex: 1,
            padding: "10px 14px",
            background: "#111827",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            outline: "none",
            fontSize: "13px",
            color: "#e2e8f0",
            fontFamily: "'DM Sans', sans-serif",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        />
        <button
          className="cs-send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            width: 38, height: 38,
            borderRadius: "8px",
            background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
            border: "none",
            color: "white",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            opacity: loading || !input.trim() ? 0.5 : 1,
            transition: "opacity 0.2s, background 0.2s",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );

  // ── EMBEDDED MODE (inside Dashboard sidebar) ──
  if (embedded) {
    return renderChatUI();
  }

  // ── FLOATING MODE ──
  return (
    <>
      <style>{`
        @keyframes cs-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cs-fab:hover {
          transform: scale(1.08) !important;
          box-shadow: 0 8px 32px rgba(14,165,233,0.45) !important;
        }
        .cs-fab-close:hover {
          background: rgba(239,68,68,0.1) !important;
          color: #ef4444 !important;
        }
      `}</style>

      {/* FAB */}
      <button
        className="cs-fab"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: 24, right: 24,
          width: 56, height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
          border: "none",
          color: "white",
          boxShadow: "0 4px 24px rgba(14,165,233,0.35)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        )}
      </button>

      {/* Floating Window */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: 92, right: 24,
          width: 360,
          background: "#0b1220",
          border: "1px solid #1e293b",
          borderRadius: "16px",
          boxShadow: "0 16px 60px rgba(0,0,0,0.5)",
          zIndex: 1000,
          overflow: "hidden",
          fontFamily: "'DM Sans', sans-serif",
          animation: "cs-slide-up 0.25s ease",
        }}>
          {/* Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            background: "#0b1220",
            borderBottom: "1px solid #1e293b",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32,
                borderRadius: "8px",
                background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 12px rgba(14,165,233,0.3)",
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f0f9ff" }}>Security Assistant</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#22c55e", marginTop: 1 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e" }} />
                  Online · AI-powered
                </div>
              </div>
            </div>
            <button
              className="cs-fab-close"
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#475569",
                cursor: "pointer",
                width: 28, height: 28,
                borderRadius: "6px",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Chat Body */}
          <div style={{ padding: "16px 16px 16px" }}>
            {renderChatUI()}
          </div>
        </div>
      )}
    </>
  );
}