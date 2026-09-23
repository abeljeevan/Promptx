export function WitnessStatementDoc({ statement }) {
  return (
    <section className="doc-statement-block">
      <div className="doc-subhead">WITNESS STATEMENT</div>
      <p className="doc-witness">{statement.witness}</p>
      <p className="doc-statement">{statement.body}</p>
      <div className="doc-signature" aria-hidden="true" />
      <p className="doc-note">Statement recorded and signed.</p>
    </section>
  );
}
