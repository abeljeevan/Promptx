export function Timer({ secondsRemaining, inline = false }) {
  const safe = Math.max(0, secondsRemaining);
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  const critical = safe <= 60;

  if (inline) {
    return (
      <b className={critical ? "timer-critical-inline" : undefined}>
        {minutes}:{seconds}
      </b>
    );
  }

  return (
    <div className={`timer${critical ? " timer-critical" : ""}`}>
      <span className="timer-label">TIME</span>
      <span className="timer-value">
        {minutes}:{seconds}
      </span>
    </div>
  );
}
