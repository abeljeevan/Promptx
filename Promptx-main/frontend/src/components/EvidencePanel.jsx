const EVIDENCE_SLOTS = [
  { id: "suspect_dossier", label: "Suspect Dossier (A. Vale)", alwaysUnlocked: true },
  { id: "access_card", label: "Access Card Record" },
  { id: "cctv", label: "CCTV Fragment" },
  { id: "phone_records", label: "Phone Record" },
  { id: "victim_files", label: "Archive File" },
  { id: "physical_clue", label: "Final Evidence" },
];

export function EvidencePanel({ evidenceFound, onSelect }) {
  const found = new Set(evidenceFound);

  return (
    <aside className="evidence-panel" aria-label="Case evidence">
      <h2 className="evidence-title">CASE EVIDENCE</h2>
      <ul className="evidence-list">
        {EVIDENCE_SLOTS.map((slot) => {
          const unlocked = slot.alwaysUnlocked || found.has(slot.id);
          return (
            <li key={slot.id}>
              <button
                type="button"
                className={`evidence-item${unlocked ? " evidence-unlocked" : ""}`}
                disabled={!unlocked}
                onClick={() => unlocked && onSelect?.(slot.id)}
              >
                <span className="evidence-check">[{unlocked ? "x" : " "}]</span>
                <span>{unlocked ? slot.label : "???"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
