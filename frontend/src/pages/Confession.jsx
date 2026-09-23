import { useEffect, useState, useRef } from "react";
import { submitResult } from "../api";

const CASE_SUMMARY = [
  ["SUSPECT", "Adrian Vale"],
  ["VICTIM", "Daniel Mercer"],
  ["LOCATION", "Archive Room"],
  ["TIME", "21:42"],
  ["MOTIVE", "Victim discovered forensic data manipulation"],
];

function formatTime(seconds) {
  const safe = Math.max(0, seconds ?? 0);
  const m = String(Math.floor(safe / 60)).padStart(2, "0");
  const s = String(safe % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function Confession({ session, onRestart, onViewLeaderboard }) {
  const [revealed, setRevealed] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [resultData, setResultData] = useState(null);
  const submitAttempted = useRef(false);

  const confessed = session.status === "CONFESSION";
  const endReason =
    session.status === "OUT_OF_PROMPTS"
      ? "10-PROMPT LIMIT REACHED"
      : session.status === "TIME_EXPIRED"
        ? "10-MINUTE TIME LIMIT REACHED"
        : "INTERROGATION TERMINATED";

  const caseSummary = [
    ...CASE_SUMMARY,
    ["TIME REMAINING", formatTime(session.seconds_remaining)],
    ["PROMPTS LEFT", String(session.prompts_left ?? 0).padStart(2, "0")],
  ];

  // Reveal animation
  useEffect(() => {
    const id = window.setTimeout(() => setRevealed(true), 1400);
    return () => window.clearTimeout(id);
  }, []);

  // Auto-submit result to backend on mount (once only)
  useEffect(() => {
    if (submitAttempted.current) return;
    submitAttempted.current = true;

    const code = session.code || session.session_id;
    if (!code) {
      setSubmitError("No promo code found — result not saved.");
      return;
    }

    submitResult(code, session.seconds_remaining ?? 0)
      .then((data) => {
        setScoreSubmitted(true);
        setResultData(data);
      })
      .catch((err) => {
        setSubmitError("Failed to save result: " + err.message);
      });
  }, [session]);

  return (
    <main className="confession-screen" style={{ overflowY: "auto", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h1 className="confession-headline">{confessed ? "CASE CLOSED" : "CASE UNRESOLVED"}</h1>
        <p className="confession-sub">
          {confessed ? "ADRIAN VALE HAS CONFESSED" : `GAME OVER — ${endReason}`}
        </p>

        {confessed && session.response && (
          <blockquote className="confession-quote">{session.response}</blockquote>
        )}

        {confessed && (
          <dl className={`confession-summary${revealed ? " confession-summary-visible" : ""}`}>
            {caseSummary.map(([label, value]) => (
              <div key={label} className="confession-row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="confession-meta">
          SESSION {session.code || session.session_id} — FINAL STRESS {session.stress}%
          {!confessed && " — NO CONFESSION RECORDED"}
        </p>

        {/* Score result feedback */}
        {scoreSubmitted && resultData && !resultData.duplicate && (
          <div style={{
            padding: "1.5rem",
            background: "rgba(0,0,0,0.4)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            textAlign: "center",
          }}>
            <p style={{ color: "var(--color-accent-light)", fontWeight: "bold", margin: "0 0 0.75rem 0" }}>
              RESULT SUBMITTED TO LEADERBOARD
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "2rem", flexWrap: "wrap" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                SCORE <b style={{ color: "var(--text-primary)" }}>{resultData.score}</b>
              </span>
              <span style={{ color: "var(--text-secondary)" }}>
                TIME <b style={{ color: "var(--text-primary)" }}>{formatTime(resultData.time_taken)}</b>
              </span>
              <span style={{ color: "var(--text-secondary)" }}>
                QUESTIONS <b style={{ color: "var(--text-primary)" }}>{resultData.questions_used}</b>
              </span>
              <span style={{ color: "var(--text-secondary)" }}>
                {resultData.solved ? "✅ SOLVED" : "❌ UNSOLVED"}
              </span>
            </div>
          </div>
        )}

        {scoreSubmitted && resultData && resultData.duplicate && (
          <p style={{ color: "var(--text-secondary)", textAlign: "center", marginTop: "0.5rem" }}>
            Result already recorded.
          </p>
        )}

        {submitError && (
          <p className="error-text" style={{ textAlign: "center" }}>{submitError}</p>
        )}

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "2rem" }}>
          <button type="button" className="new-case-button" onClick={onRestart}>
            OPEN NEW CASE
          </button>

          <button
            type="button"
            onClick={onViewLeaderboard}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              padding: "0.5rem 1rem",
            }}
          >
            VIEW LEADERBOARD
          </button>
        </div>
      </div>
    </main>
  );
}
