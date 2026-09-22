import { useEffect, useState } from "react";
import { submitScore } from "../api";

const CASE_SUMMARY = [
  ["SUSPECT", "Adrian Vale"],
  ["VICTIM", "Daniel Mercer"],
  ["LOCATION", "Archive Room"],
  ["TIME", "21:42"],
  ["MOTIVE", "Victim discovered forensic data manipulation"],
];

function formatTimeRemaining(secondsRemaining) {
  const safe = Math.max(0, secondsRemaining ?? 0);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function Confession({ session, onRestart, onViewLeaderboard }) {
  const [revealed, setRevealed] = useState(false);
  const confessed = session.status === "CONFESSION";
  const endReason =
    session.status === "OUT_OF_PROMPTS"
      ? "10-PROMPT LIMIT REACHED"
      : session.status === "TIME_EXPIRED"
        ? "10-MINUTE TIME LIMIT REACHED"
        : "INTERROGATION TERMINATED";
  const caseSummary = [
    ...CASE_SUMMARY,
    ["TIME REMAINING", formatTimeRemaining(session.seconds_remaining)],
    ["PROMPTS LEFT", String(session.prompts_left ?? 0).padStart(2, "0")],
  ];

  const [playerName, setPlayerName] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setRevealed(true), 1400);
    return () => window.clearTimeout(id);
  }, []);

  const handleScoreSubmit = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await submitScore({
        player_name: playerName.trim(),
        turn_count: session.turn_count || session.question_count || 0,
        stress_level: session.stress,
        evidence_count: session.evidence_found ? session.evidence_found.length : 0,
        facts_count: session.facts_count || 0,
      });
      setScoreSubmitted(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          SESSION {session.session_id} — FINAL STRESS {session.stress}%
          {!confessed && " — NO CONFESSION RECORDED"}
        </p>

        {confessed && !scoreSubmitted && (
          <form onSubmit={handleScoreSubmit} style={{ marginTop: "1rem", padding: "1.5rem", background: "rgba(0,0,0,0.4)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <h3 style={{ margin: "0 0 1rem 0", color: "var(--text-primary)" }}>SUBMIT REPORT TO COMMAND</h3>
            <div style={{ display: "flex", gap: "1rem" }}>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter Detective Name"
                style={{ flex: 1 }}
                autoComplete="off"
                required
              />
              <button type="submit" disabled={isSubmitting} style={{ width: "auto", padding: "0 1.5rem" }}>
                {isSubmitting ? "SUBMITTING..." : "SUBMIT SCORE"}
              </button>
            </div>
            {submitError && <p className="error-text" style={{ marginTop: "0.5rem" }}>{submitError}</p>}
          </form>
        )}

        {scoreSubmitted && (
          <p style={{ color: "var(--color-accent-light)", textAlign: "center", marginTop: "1rem", fontWeight: "bold" }}>
            SCORE SUBMITTED TO LEADERBOARD
          </p>
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
