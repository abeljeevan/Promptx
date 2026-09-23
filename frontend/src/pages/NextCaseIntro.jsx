// Title card between Adrian's case and "The Silent Witness": the poster fades up
// from black, then PLAY hands the player over to the second case's frontend.
export function NextCaseIntro({ onPlay }) {
  return (
    <main className="next-case-intro" aria-label="Next case: Silent Witness Door">
      {/* The frame keeps the poster's 3:2 shape so PLAY stays on its bottom edge. */}
      <div className="next-case-intro-frame">
        <img
          className="next-case-intro-image"
          src="/assets/intro/silent-witness-intro.jpeg"
          alt="Silent Witness Door. Five people. One truth. Who is lying?"
        />
        <button type="button" className="next-case-play" onClick={onPlay} autoFocus>
          ▶ PLAY
        </button>
      </div>
    </main>
  );
}
