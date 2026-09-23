const CONTROLS = [
  { key: "width", label: "Width (vw)", min: 8, max: 60, unit: "vw" },
  { key: "bottom", label: "Bottom (up = higher)", min: -20, max: 70, unit: "%" },
  { key: "left", label: "Horizontal", min: 20, max: 80, unit: "%" },
  { key: "brightness", label: "Brightness", min: 30, max: 160, unit: "%" },
];

export function SuspectTuner({ values, onChange }) {
  const css = `.room-suspect {
  width: ${values.width}vw;
  left: ${values.left}%;
  bottom: ${values.bottom}%;
  filter: brightness(${(values.brightness / 100).toFixed(2)}) contrast(1.1) saturate(0.85);
}`;

  return (
    <div className="tuner">
      <strong className="tuner-title">SUSPECT TUNER (temporary)</strong>
      {CONTROLS.map((control) => (
        <label key={control.key} className="tuner-row">
          <span>{control.label}</span>
          <input
            type="range"
            min={control.min}
            max={control.max}
            value={values[control.key]}
            onChange={(event) =>
              onChange({ ...values, [control.key]: Number(event.target.value) })
            }
          />
          <output>
            {values[control.key]}
            {control.unit}
          </output>
        </label>
      ))}
      <pre className="tuner-output">{css}</pre>
      <p className="tuner-hint">Drag until he sits right, then paste this block to me.</p>
    </div>
  );
}
