import { useEffect, useState } from "react";

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

export function Confession({ session, onRestart }) {
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

  useEffect(() => {
    const id = window.setTimeout(() => setRevealed(true), 1400);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <main className="confession-screen">
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

      {!confessed && (
        <button type="button" className="new-case-button" onClick={onRestart}>
          OPEN NEW CASE
        </button>
      )}
    </main>
  );
}
