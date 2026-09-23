import { useState } from "react";
import { startGame } from "../api";

export function Start({ onStarted, onViewLeaderboard }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter your participant code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const session = await startGame(trimmed);
      onStarted(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="start-screen">
      <div className="start-card">
        <h1 className="start-title">
          PROMPT <span className="start-x">X</span>
        </h1>
        <p className="start-sub">INTERROGATION PROTOCOL — CASE #07</p>

        <form onSubmit={handleSubmit} className="start-form">
          <label htmlFor="participant-code">PARTICIPANT CODE</label>
          <input
            id="participant-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="PX-001"
            autoComplete="off"
            autoFocus
          />
          <button type="submit" disabled={loading}>
            {loading ? "CONNECTING..." : "BEGIN INTERROGATION"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </form>

        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button 
            type="button" 
            onClick={onViewLeaderboard} 
            style={{ 
              background: "transparent", 
              border: "1px solid var(--border-color)", 
              color: "var(--text-secondary)",
              padding: "0.5rem 1rem",
              fontSize: "0.8rem",
              width: "auto"
            }}
          >
            VIEW LEADERBOARD
          </button>
        </div>

        <p className="start-brief">Adrian Vale denies everything. Find the contradiction.</p>
      </div>
    </main>
  );
}
