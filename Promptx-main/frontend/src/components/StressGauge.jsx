import { STRESS_TIERS, stressTier } from "./SuspectPortrait";

// Colour per tier, walking from the terminal green through tungsten to the
// warning red. The tiers themselves come from SuspectPortrait so the gauge,
// the portrait and the rules engine can never disagree about what state
// Adrian is in.
const TIER_COLOR = {
  calm: "var(--px-terminal)",
  alert: "#b9c96a",
  defensive: "var(--px-tungsten)",
  pressured: "#c2652f",
  breaking: "var(--px-warning)",
};

export function StressGauge({ stress }) {
  const tier = stressTier(stress);
  const index = STRESS_TIERS.indexOf(tier);

  return (
    <div
      className={`stress-gauge${tier.id === "breaking" ? " stress-gauge-breaking" : ""}`}
      data-tier={tier.id}
      style={{ "--stress-color": TIER_COLOR[tier.id], "--tier-step": index }}
    >
      <div className="stress-gauge-head">
        <span>SUSPECT STRESS</span>
        <span className="stress-gauge-state">{tier.label}</span>
      </div>
      <div
        className="stress-track"
        role="meter"
        aria-valuenow={stress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${stress} percent, ${tier.label}`}
        aria-label="Suspect stress level"
      >
        {/* Tier boundaries, so a rising bar reads as progress toward breaking
            him rather than an unmarked percentage. */}
        {STRESS_TIERS.slice(0, -1).map((boundary) => (
          <i
            key={boundary.id}
            className="stress-tick"
            style={{ "--at": `${boundary.max}%` }}
            aria-hidden="true"
          />
        ))}
        <div className="stress-fill" style={{ "--stress-scale": stress / 100 }} />
      </div>
      <div className="stress-value">{stress}%</div>
    </div>
  );
}
