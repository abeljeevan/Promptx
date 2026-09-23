import { useEffect, useRef, useState } from "react";

// The five tiers the engine actually reports (py.py get_stress_state). Keep this
// list and its thresholds in sync with the backend — the HUD must never claim a
// state the rules engine doesn't have.
export const STRESS_TIERS = [
  { id: "calm", max: 20, label: "CALM" },
  { id: "alert", max: 40, label: "ALERT" },
  { id: "defensive", max: 60, label: "DEFENSIVE" },
  { id: "pressured", max: 80, label: "PRESSURED" },
  { id: "breaking", max: 100, label: "BREAKING" },
];

export function stressTier(stress) {
  return STRESS_TIERS.find((tier) => stress <= tier.max) ?? STRESS_TIERS[STRESS_TIERS.length - 1];
}

// Drawn expression frames, one per tier. Drop files with these names into
// public/assets/character/ and they are used automatically; any tier without a
// file falls back to the base portrait, which the CSS performance layer grades
// and moves so the suspect still reacts. See ASSET_MANIFEST.md.
const FRAME_SRC = {
  calm: "/assets/character/suspect-calm.png",
  alert: "/assets/character/suspect-alert.png",
  defensive: "/assets/character/suspect-defensive.png",
  pressured: "/assets/character/suspect-pressured.png",
  breaking: "/assets/character/suspect-breaking.png",
};

const BASE_SRC = "/assets/character/suspect-portrait-source.png";

/**
 * The suspect as a performer rather than a still.
 *
 * Two layers do the acting:
 *   1. Drawn frames, crossfaded when the stress tier changes. Frames that are
 *      not present resolve to the base portrait, so partial art sets work.
 *   2. A CSS performance layer (grade, tremor, breath) driven by --stress and
 *      --tier-step, which carries the reaction on its own until art lands.
 *
 * A jump in stress also fires a one-shot flinch, so pressure reads as a
 * reaction to the question just asked and not only as a new resting face.
 */
export function SuspectPortrait({ stress = 0, tune }) {
  const tier = stressTier(stress);
  const tierIndex = STRESS_TIERS.indexOf(tier);

  // Frames confirmed to exist. Unknown frames are probed once and cached, so a
  // missing file costs one failed request rather than a broken image.
  const [available, setAvailable] = useState({});
  const [flinch, setFlinch] = useState(false);
  const previousStress = useRef(stress);

  useEffect(() => {
    let cancelled = false;
    const src = FRAME_SRC[tier.id];
    if (!src || available[tier.id] !== undefined) return;

    // A dev server answers a missing asset with the SPA shell (200 text/html)
    // rather than a 404, so "did it load" is not enough — the response has to
    // actually be an image before we swap the portrait for it.
    fetch(src, { method: "HEAD" })
      .then((res) => res.ok && (res.headers.get("content-type") || "").startsWith("image/"))
      .catch(() => false)
      .then((ok) => {
        if (!cancelled) setAvailable((seen) => ({ ...seen, [tier.id]: ok }));
      });

    return () => {
      cancelled = true;
    };
  }, [tier.id, available]);

  // A meaningful jump in pressure reads as a flinch. Small drifts do not, so
  // the suspect isn't twitching constantly.
  useEffect(() => {
    const delta = stress - previousStress.current;
    previousStress.current = stress;
    if (delta < 6) return;

    setFlinch(true);
    const id = window.setTimeout(() => setFlinch(false), 420);
    return () => window.clearTimeout(id);
  }, [stress]);

  const src = available[tier.id] ? FRAME_SRC[tier.id] : BASE_SRC;

  const style = {
    "--stress": stress / 100,
    "--tier-step": tierIndex,
  };
  if (tune) {
    style["--suspect-width"] = `${tune.width}vw`;
    style["--suspect-bottom"] = `${tune.bottom}%`;
    style["--suspect-left"] = `${tune.left}%`;
    style["--suspect-brightness"] = tune.brightness / 100;
  }

  return (
    <div
      className={`suspect-figure${flinch ? " is-flinching" : ""}`}
      data-tier={tier.id}
      style={style}
    >
      {/* Keyed so a tier change mounts a new node and the two frames crossfade
          instead of the src swapping underneath a single element. */}
      <img key={src} className="suspect-frame" src={src} alt="Adrian Vale" />
    </div>
  );
}
