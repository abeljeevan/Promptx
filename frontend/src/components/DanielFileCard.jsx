/**
 * DanielFileCard — the victim's case file sitting on the RIGHT side of the
 * interrogation desk.  Mirrors the hover-lift behaviour of the left-side props
 * (desk-case-folder / desk-file).  Clicking it fires onOpen so the parent can
 * render the full-screen DanielFileModal.
 */
export function DanielFileCard({ onOpen }) {
  return (
    <button
      type="button"
      className="daniel-file-card"
      onClick={onOpen}
      aria-label="Open Daniel Mercer victim file"
      title="VICTIM FILE — DANIEL MERCER"
    >
      <img
        src="/assets/props/daniel-file.jpeg"
        alt="Daniel Mercer — Victim Case File"
        className="daniel-file-thumb"
        draggable="false"
      />
      <span className="daniel-file-tag">VICTIM FILE</span>
    </button>
  );
}
