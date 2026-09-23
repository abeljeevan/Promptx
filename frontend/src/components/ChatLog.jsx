import { useEffect, useRef } from "react";

export function ChatLog({ entries }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length]);

  return (
    <section className="chat-log" aria-label="Interrogation transcript" aria-live="polite">
      {entries.length === 0 && (
        <p className="chat-empty">No questions asked yet. Begin the interrogation.</p>
      )}
      {entries.map((entry, index) => (
        <div key={index} className={`chat-entry chat-${entry.role}`}>
          <span className="chat-role">{entry.role === "player" ? "YOU" : "ADRIAN"}</span>
          <p className="chat-text">{entry.text}</p>
        </div>
      ))}
      <div ref={endRef} />
    </section>
  );
}
