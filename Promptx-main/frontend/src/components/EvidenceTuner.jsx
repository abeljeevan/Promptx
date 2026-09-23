const CONTROLS = [
  { key: "left", label: "Left (rem)", min: 0, max: 60, unit: "rem" },
  { key: "bottom", label: "Bottom (rem)", min: -4, max: 24, unit: "rem" },
  { key: "folderWidth", label: "Folder width (rem)", min: 6, max: 40, unit: "rem" },
  { key: "folderHeight", label: "Folder height (rem)", min: 3, max: 24, unit: "rem" },
  { key: "rotate", label: "Rotation", min: -20, max: 20, unit: "deg" },
];

export function EvidenceTuner({ values, onChange }) {
  const css = `.desk-evidence {
  left: ${values.left}rem;
  bottom: ${values.bottom}rem;
}
.desk-case-folder {
  width: ${values.folderWidth}rem;
  height: ${values.folderHeight}rem;
  transform: rotate(${values.rotate}deg) skewY(-2deg);
}`;

  return (
    <div className="tuner tuner-evidence">
      <strong className="tuner-title">EVIDENCE TUNER (temporary)</strong>
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
      <p className="tuner-hint">Drag until it sits right, then paste this block to me.</p>
    </div>
  );
}
