import { useEffect } from "react";

/**
 * DanielFileModal — full-screen lightbox that lets the player read the
 * Daniel Mercer victim file image in detail.  Closes on Escape, backdrop
 * click, or the CLOSE button.
 */
export function DanielFileModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="daniel-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Daniel Mercer Victim File"
      onClick={onClose}
    >
      <div
        className="daniel-modal-inner"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="daniel-modal-header">
          <div className="daniel-modal-title-group">
            <span className="daniel-modal-label">CONFIDENTIAL // VICTIM FILE</span>
            <h2 className="daniel-modal-title">DANIEL MERCER</h2>
            <span className="daniel-modal-ref">CASE-VALE-01 / PROJECT ECHO</span>
          </div>
          <span className="daniel-modal-stamp">DECEASED</span>
        </div>

        <div className="daniel-modal-body">
          <img
            src="/assets/props/daniel-file.jpeg"
            alt="Daniel Mercer full victim case file"
            className="daniel-modal-img"
            draggable="false"
          />
        </div>

        <footer className="daniel-modal-footer">
          <button
            type="button"
            className="doc-close"
            onClick={onClose}
            autoFocus
          >
            CLOSE FILE
          </button>
        </footer>
      </div>
    </div>
  );
}
