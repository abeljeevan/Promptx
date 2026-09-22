import { useState, useEffect } from "react";
import { getLeaderboard } from "../api";

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

export function Leaderboard({ onBack }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("GLOBAL");

  useEffect(() => {
    getLeaderboard()
      .then((data) => {
        setScores(data.leaderboard || []);
        setLoading(false);
      })
      .catch((err) => {
        setError("ARCHIVE ACCESS DENIED: " + err.message);
        setLoading(false);
      });
  }, []);

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
            {["GLOBAL", "FRIENDS", "MY RANK"].map((tab) => (
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

        {/* Table */}
        <div className="lb-table-wrap">
          <table className="lb-table">
            <thead>
              <tr className="lb-thead-row">
                <th className="lb-th lb-th-rank">#</th>
                <th className="lb-th lb-th-player">PLAYER</th>
                <th className="lb-th lb-th-prompts">PROMPTS USED</th>
                <th className="lb-th lb-th-evidence">EVIDENCE</th>
                <th className="lb-th lb-th-facts">FACTS</th>
                <th className="lb-th lb-th-score">STRESS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="lb-td-status">
                    <span className="lb-blink">█</span> ACCESSING ARCHIVES...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6" className="lb-td-status lb-td-error">{error}</td>
                </tr>
              ) : scores.length === 0 ? (
                <tr>
                  <td colSpan="6" className="lb-td-status">
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
                      <td className="lb-td lb-td-rank">
                        <span className="lb-rank-num" style={medal ? { color: medal.color } : {}}>
                          {index + 1}
                        </span>
                        {isTopThree && <TrophyIcon rank={index} />}
                      </td>
                      <td className="lb-td lb-td-player">
                        <AvatarIcon name={score.player_name} />
                        <span
                          className="lb-player-name"
                          style={medal ? { color: medal.color } : {}}
                        >
                          {score.player_name}
                        </span>
                      </td>
                      <td className="lb-td lb-td-center">
                        {score.turn_count}
                      </td>
                      <td className="lb-td lb-td-center">
                        {score.evidence_count}
                      </td>
                      <td className="lb-td lb-td-center">
                        {score.facts_count}
                      </td>
                      <td
                        className="lb-td lb-td-score"
                        style={medal ? { color: medal.color } : {}}
                      >
                        {score.stress_level}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
