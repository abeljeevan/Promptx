import { useState, useEffect } from "react";
import { getLeaderboard, getMyRank } from "../api";

const MEDALS = {
  0: { icon: "🥇", color: "#c9a02d", borderColor: "#c9a02d22", bg: "rgba(201,160,45,0.07)" },
  1: { icon: "🥈", color: "#a0a8b0", borderColor: "#a0a8b022", bg: "rgba(160,168,176,0.05)" },
  2: { icon: "🥉", color: "#b36a2a", borderColor: "#b36a2a22", bg: "rgba(179,106,42,0.07)" },
};

function TrophyIcon({ rank }) {
  const medal = MEDALS[rank];
  if (!medal) return null;
  return (
    <span className="lb-trophy" style={{ color: medal.color }}>
      {medal.icon}
    </span>
  );
}

function AvatarIcon({ name }) {
  const initials = name ? name.slice(0, 2).toUpperCase() : "??";
  return (
    <div className="lb-avatar">
      <svg viewBox="0 0 36 36" width="36" height="36">
        <circle cx="18" cy="18" r="18" fill="rgba(168,213,154,0.1)" />
        <circle cx="18" cy="14" r="7" fill="rgba(168,213,154,0.25)" />
        <ellipse cx="18" cy="34" rx="11" ry="8" fill="rgba(168,213,154,0.15)" />
        <circle cx="18" cy="18" r="17" fill="none" stroke="rgba(168,213,154,0.2)" strokeWidth="1" />
      </svg>
      <span className="lb-avatar-initials">{initials}</span>
    </div>
  );
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds ?? 0);
  const m = String(Math.floor(safe / 60)).padStart(2, "0");
  const s = String(safe % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function Leaderboard({ onBack, promoCode }) {
  const [scores, setScores] = useState([]);
  const [myRankData, setMyRankData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("GLOBAL");

  useEffect(() => {
    setLoading(true);
    setError("");

    if (activeTab === "GLOBAL") {
      getLeaderboard()
        .then((data) => {
          setScores(data.leaderboard || []);
          setLoading(false);
        })
        .catch((err) => {
          setError("ARCHIVE ACCESS DENIED: " + err.message);
          setLoading(false);
        });
    } else if (activeTab === "MY RANK") {
      if (!promoCode) {
        setMyRankData({ found: false, message: "NO ACTIVE SESSION FOUND. LOGIN REQUIRED." });
        setLoading(false);
        return;
      }

      getMyRank(promoCode)
        .then((data) => {
          setMyRankData(data);
          setLoading(false);
        })
        .catch((err) => {
          setError("RANK QUERY FAILED: " + err.message);
          setLoading(false);
        });
    }
  }, [activeTab, promoCode]);

  return (
    <div className="lb-screen">
      {/* Top chrome bar */}
      <div className="lb-chrome-bar">
        <div className="lb-chrome-logo">
          PROMPT <span className="lb-chrome-x">X</span>
          <span className="lb-chrome-version">INTERROGATION PROTOCOL v1.0.0</span>
        </div>
        <div className="lb-chrome-case">
          <div className="lb-case-field">
            <span className="lb-case-label">CASE</span>
            <span className="lb-case-sep">:</span>
            <span className="lb-case-value">THE SILENT WITNESS</span>
          </div>
          <div className="lb-case-field">
            <span className="lb-case-label">MODE</span>
            <span className="lb-case-sep">:</span>
            <span className="lb-case-value">INTERROGATION</span>
          </div>
          <div className="lb-case-field">
            <span className="lb-case-label">STATUS</span>
            <span className="lb-case-sep">:</span>
            <span className="lb-case-value lb-status-active">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Sidebar left */}
      <div className="lb-sidebar-left">
        <p className="lb-sidebar-text">TRUTH</p>
        <p className="lb-sidebar-text">LIES</p>
        <p className="lb-sidebar-text">IN YOUR PROMPT.</p>
      </div>

      {/* Sidebar right */}
      <div className="lb-sidebar-right">
        <p className="lb-sidebar-text">OBSERVE.</p>
        <p className="lb-sidebar-text">QUESTION.</p>
        <p className="lb-sidebar-text">CONNECT.</p>
        <p className="lb-sidebar-text">SOLVE.</p>
        <p className="lb-sidebar-text lb-sidebar-dim">—</p>
      </div>

      {/* Main panel */}
      <main className="lb-main">
        {/* Header */}
        <div className="lb-header">
          <div className="lb-title-block">
            <span className="lb-slash">// </span>
            <h1 className="lb-title">LEADERBOARD</h1>
            <p className="lb-subtitle">THE SHARPEST MINDS. THE DEEPEST TRUTHS.</p>
          </div>
          <div className="lb-tabs">
            {["GLOBAL", "MY RANK"].map((tab) => (
              <button
                key={tab}
                className={`lb-tab${activeTab === tab ? " lb-tab-active" : ""}`}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Table / My Rank Area */}
        <div className="lb-table-wrap">
          {activeTab === "GLOBAL" ? (
            <table className="lb-table">
              <thead>
                <tr className="lb-thead-row">
                  <th className="lb-th lb-th-player">PROMO CODE</th>
                  <th className="lb-th lb-th-score">SCORE</th>
                  <th className="lb-th lb-th-prompts">TIME</th>
                  <th className="lb-th lb-th-evidence">QUESTIONS</th>
                  <th className="lb-th lb-th-facts">SOLVED</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="lb-td-status">
                      <span className="lb-blink">█</span> ACCESSING ARCHIVES...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="5" className="lb-td-status lb-td-error">{error}</td>
                  </tr>
                ) : scores.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="lb-td-status">
                      NO RECORDS ON FILE
                    </td>
                  </tr>
                ) : (
                  scores.map((score, index) => {
                    const medal = MEDALS[index];
                    const isTopThree = index < 3;
                    return (
                      <tr
                        key={index}
                        className={`lb-row${isTopThree ? " lb-row-top" : ""}`}
                        style={medal ? {
                          background: medal.bg,
                          borderColor: medal.borderColor,
                        } : {}}
                      >
                        <td className="lb-td lb-td-player">
                          <AvatarIcon name={score.promo_code} />
                          <span
                            className="lb-player-name"
                            style={medal ? { color: medal.color } : {}}
                          >
                            {score.promo_code}
                          </span>
                        </td>
                        <td
                          className="lb-td lb-td-score"
                          style={medal ? { color: medal.color } : {}}
                        >
                          {score.score}
                        </td>
                        <td className="lb-td lb-td-center">
                          {formatTime(score.time_taken)}
                        </td>
                        <td className="lb-td lb-td-center">
                          {score.questions_used}
                        </td>
                        <td className="lb-td lb-td-center">
                          {score.solved ? "✓" : "✕"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* MY RANK VIEW */
            <div style={{ padding: "2rem" }}>
              {loading ? (
                <div className="lb-td-status">
                  <span className="lb-blink">█</span> LOCATING DOSSIER...
                </div>
              ) : error ? (
                <div className="lb-td-status lb-td-error">{error}</div>
              ) : !myRankData?.found ? (
                <div className="lb-td-status">
                  {myRankData?.message || "NO RECORD FOUND"}
                </div>
              ) : (
                <div style={{ 
                  background: "rgba(0,0,0,0.4)", 
                  border: "1px solid var(--px-terminal-dim)",
                  borderRadius: "8px",
                  padding: "2rem",
                  maxWidth: "500px",
                  margin: "0 auto",
                  color: "var(--px-terminal)"
                }}>
                  <h2 style={{ 
                    borderBottom: "1px solid rgba(168,213,154,0.2)", 
                    paddingBottom: "1rem",
                    marginBottom: "1.5rem",
                    textAlign: "center",
                    letterSpacing: "0.2em"
                  }}>
                    MY RANK: {myRankData.promo_code}
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "1.1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--px-terminal-dim)" }}>RANK</span>
                      <strong>#{myRankData.rank}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--px-terminal-dim)" }}>SCORE</span>
                      <strong>{myRankData.score}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--px-terminal-dim)" }}>TIME</span>
                      <strong>{formatTime(myRankData.time_taken)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--px-terminal-dim)" }}>QUESTIONS</span>
                      <strong>{myRankData.questions_used}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--px-terminal-dim)" }}>SOLVED</span>
                      <strong>{myRankData.solved ? "✓" : "✕"}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Bottom back button */}
      <div className="lb-footer">
        <span className="lb-footer-left">PROMPT X — TRUTH ALWAYS SURFACES</span>
        <button type="button" className="lb-back-btn" onClick={onBack}>
          ◀ BACK TO CASE
        </button>
        <span className="lb-footer-right">SUB-BASEMENT INTERROGATION ROOM | CASE-SILENT-01</span>
      </div>
    </div>
  );
}
