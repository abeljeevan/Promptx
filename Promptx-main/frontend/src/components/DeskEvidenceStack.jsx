import { EVIDENCE_CONTENT, EVIDENCE_PHOTOS } from "../data/evidenceContent";

const PHOTO_IDS = new Set(Object.keys(EVIDENCE_PHOTOS));

export function DeskEvidenceStack({ evidenceFound, onOpen, onOpenAll, tune }) {
  const style = tune
    ? {
        "--evidence-left": `${tune.left}rem`,
        "--evidence-bottom": `${tune.bottom}rem`,
        "--evidence-folder-w": `${tune.folderWidth}rem`,
        "--evidence-folder-h": `${tune.folderHeight}rem`,
        "--evidence-rotate": `${tune.rotate}deg`,
      }
    : undefined;

  return (
    <section className="desk-evidence" aria-label="Evidence on desk" style={style}>
      <button
        type="button"
        className="desk-case-folder"
        onClick={onOpenAll}
        aria-label={`Open case evidence — ${evidenceFound.length} of 5 files discovered`}
      >
        <img src="/assets/props/desk-case-file-v2.png" alt="" />
      </button>
      {evidenceFound.map((id, index) => {
        const item = EVIDENCE_CONTENT[id] ?? EVIDENCE_PHOTOS[id];
        if (!item) return null;
        const photo = PHOTO_IDS.has(id);
        return (
          <button key={id} type="button" className={`desk-file desk-file-${index}${photo ? " desk-file-photo" : ""}`} onClick={() => onOpen(id)} aria-label={`Open ${item.title}`}>
            {photo ? <img src={item.src} alt="" /> : <span className="desk-file-paper"><i>EX-{String(index + 1).padStart(2, "0")}</i><strong>{item.title}</strong><em>{item.reference}</em></span>}
            <span className="desk-file-label">{item.title}</span>
          </button>
        );
      })}
    </section>
  );
}
