import { useEffect } from "react";
import { EVIDENCE_CONTENT, EVIDENCE_PHOTOS, SUSPECT_PROFILE } from "../../data/evidenceContent";
import { WitnessStatementDoc } from "./WitnessStatementDoc";
import { FingerprintDoc } from "./FingerprintDoc";
import { PopText } from "../ui/PopText";

function SuspectDossierDoc() {
  const p = SUSPECT_PROFILE;
  return (
    <div className="doc-body dossier-body">
      <div className="suspect-header-block">
        <div className="suspect-photo-box">
          <img src={p.photo} alt={p.name} className="suspect-mugshot-thumb" />
          <span className="mugshot-badge">SUSPECT #0890</span>
        </div>
        <div className="suspect-meta-info">
          <h4 className="suspect-name"><PopText text={p.name} speed={20} /></h4>
          <p className="suspect-role"><PopText text={p.role} delay={100} speed={15} /></p>
          <span className="suspect-status-tag"><PopText text={p.status} delay={200} speed={15} /></span>
        </div>
      </div>

      <div className="dossier-section">
        <h5 className="dossier-sec-title">// DETENTION REASON & HOW HE ENDED UP HERE</h5>
        <p className="dossier-text"><PopText text={p.howEndedUpHere} delay={300} speed={10} /></p>
      </div>

      <div className="dossier-section">
        <h5 className="dossier-sec-title">// OVERALL CRIME DETAILS</h5>
        <p className="dossier-text"><PopText text={p.crimeOverview} delay={500} speed={10} /></p>
      </div>

      <div className="dossier-section">
        <h5 className="dossier-sec-title">// KEY INTERROGATION CLUES & LEAD POINTS</h5>
        <ul className="dossier-clues">
          {p.keyClues.map((clue, idx) => (
            <li key={idx} className="clue-item">
              <strong className="clue-tag"><PopText text={clue.label} delay={700 + idx * 100} speed={15} />: </strong>
              <span className="clue-desc"><PopText text={clue.text} delay={750 + idx * 100} speed={10} /></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RecordDoc({ content }) {
  return (
    <div className="doc-body">
      <ol className="doc-timeline">
        {content.rows.map((row, index) => (
          <li key={index} className={row.flagged ? "doc-row doc-row-flagged" : "doc-row"}>
            <span className="doc-time">{row.time}</span>
            <span className="doc-event"><PopText text={row.event} speed={10} /></span>
          </li>
        ))}
      </ol>
      <p className="doc-note"><PopText text={content.note} delay={200} speed={12} /></p>
    </div>
  );
}

function PhotoDoc({ photo }) {
  return (
    <div className="doc-body">
      <figure className="doc-photo">
        <img src={photo.src} alt={photo.caption} />
        <figcaption><PopText text={photo.caption} speed={12} /></figcaption>
      </figure>
      {photo.statement && <WitnessStatementDoc statement={photo.statement} />}
      {photo.forensics && <FingerprintDoc forensics={photo.forensics} />}
    </div>
  );
}

export function EvidenceFolder({ evidenceId, onClose, onPresent, presenting }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const textContent = EVIDENCE_CONTENT[evidenceId];
  const photoContent = EVIDENCE_PHOTOS[evidenceId];
  const isDossier = evidenceId === "suspect_dossier";
  const header = textContent ?? photoContent;

  if (!header && !isDossier) return null;

  return (
    <div
      className="evidence-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={header?.title || "Suspect Dossier"}
      onClick={onClose}
    >
      <article className="evidence-folder" onClick={(event) => event.stopPropagation()}>
        <header className="doc-head">
          <div className="doc-head-top">
            <div>
              <h3><PopText text={header?.title || "SUSPECT DOSSIER"} speed={20} /></h3>
              <span className="doc-ref">{header?.reference || "DOSSIER / CASE-VALE-01"}</span>
            </div>
            <div className="suspect-mini-badge">
              <img src={SUSPECT_PROFILE.photo} alt="Suspect" className="suspect-head-thumb" />
            </div>
          </div>
          <span className="doc-stamp">EVIDENCE</span>
        </header>

        {isDossier ? (
          <SuspectDossierDoc />
        ) : textContent ? (
          <RecordDoc content={textContent} />
        ) : (
          <PhotoDoc photo={photoContent} />
        )}

        <footer className="evidence-actions">
          {!isDossier && (
            <button type="button" className="evidence-present" onClick={() => onPresent(evidenceId)} disabled={presenting}>
              {presenting ? "PRESENTING..." : "PRESENT TO SUSPECT"}
            </button>
          )}
          <button type="button" className="doc-close" onClick={onClose} autoFocus>
            CLOSE
          </button>
        </footer>
      </article>
    </div>
  );
}
