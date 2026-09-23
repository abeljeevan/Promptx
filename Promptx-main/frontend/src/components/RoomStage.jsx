import { SuspectPortrait, stressTier, STRESS_TIERS } from "./SuspectPortrait";

export function RoomStage({ stress = 0, tune, children }) {
  const intensity = Math.min(1, stress / 100);
  const tier = stressTier(stress);

  const style = {
    "--stage-intensity": intensity,
    "--stage-tier": STRESS_TIERS.indexOf(tier),
  };

  return (
    <div className="room-stage" data-tier={tier.id} style={style}>
      <img
        className="room-plate"
        src="/assets/environment/interrogation-room-plate.png"
        alt=""
        aria-hidden="true"
      />
      <div className="room-suspect-glow" aria-hidden="true" />
      <SuspectPortrait stress={stress} tune={tune} />
      <div className="room-desk-occluder" aria-hidden="true" />
      <div className="room-scanlines" aria-hidden="true" />
      <div className="room-grain" aria-hidden="true" />
      <div className="room-vignette" aria-hidden="true" />
      <div className="room-content">{children}</div>
    </div>
  );
}
