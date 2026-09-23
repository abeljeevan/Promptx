export function FingerprintDoc({ forensics }) {
  return (
    <section className="doc-forensics">
      <div className="doc-subhead">FORENSIC ANALYSIS</div>

      <div className="doc-forensics-grid">
        <svg
          className="doc-fingerprint"
          viewBox="0 0 80 100"
          role="img"
          aria-label="Partial fingerprint ridge pattern"
        >
          {Array.from({ length: forensics.ridgeCount }, (_, index) => {
            const inset = index * 2.6;
            return (
              <ellipse
                key={index}
                cx="40"
                cy="50"
                rx={34 - inset}
                ry={44 - inset * 1.25}
                fill="none"
                stroke="#2a231a"
                strokeWidth="1.1"
                opacity={0.75 - index * 0.02}
              />
            );
          })}
          <path
            d="M40 6 L40 94"
            stroke="var(--px-paper)"
            strokeWidth="7"
            opacity="0.55"
            transform="rotate(14 40 50)"
          />
        </svg>

        <dl className="doc-forensics-rows">
          <div>
            <dt>MATCH</dt>
            <dd className="doc-forensics-match">{forensics.match}</dd>
          </div>
          <div>
            <dt>CONFIDENCE</dt>
            <dd>{forensics.confidence}</dd>
          </div>
          <div>
            <dt>RIDGE POINTS</dt>
            <dd>{forensics.ridgeCount}</dd>
          </div>
          <div>
            <dt>ANALYST</dt>
            <dd>{forensics.analyst}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
