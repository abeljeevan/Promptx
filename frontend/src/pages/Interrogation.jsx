import { useEffect, useRef, useState } from "react";
import { askQuestion } from "../api";
import { RoomStage } from "../components/RoomStage";
import { StressGauge } from "../components/StressGauge";
import { Timer } from "../components/Timer";
import { EvidencePanel } from "../components/EvidencePanel";
import { EvidenceFolder } from "../components/evidence/EvidenceFolder";
import { ActionBar } from "../components/ActionBar";
import { DeskEvidenceStack } from "../components/DeskEvidenceStack";
// Re-tuning the desk evidence? Uncomment this import, the evidenceTune state,
// and the two JSX lines marked EVIDENCE TUNER below.
// import { EvidenceTuner } from "../components/EvidenceTuner";
// Re-tuning the suspect's placement? Uncomment this import, the DEFAULT_TUNE
// const, the `tune` state, and the two JSX lines marked TUNER below.
// import { SuspectTuner } from "../components/SuspectTuner";

const ROUND_SECONDS = 12 * 60;
// Only used until the server reports its own budget — server.py owns the real
// limit, and the HUD must never promise more questions than the engine allows.
const MAX_PROMPTS_FALLBACK = 15;

// const DEFAULT_TUNE = { width: 23, bottom: 20, left: 50, brightness: 101 };

export function Interrogation({ session, onStatusChange }) {
  const [entries, setEntries] = useState([]);
  const [question, setQuestion] = useState("");
  const [stress, setStress] = useState(session.stress ?? 0);
  const [milestone, setMilestone] = useState(session.milestone ?? 0);
  const [evidenceFound, setEvidenceFound] = useState(session.evidence_found ?? []);
  const [openEvidence, setOpenEvidence] = useState(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(ROUND_SECONDS);
  const [promptsLeft, setPromptsLeft] = useState(session.prompts_left ?? MAX_PROMPTS_FALLBACK);
  const [activeAction, setActiveAction] = useState("ask");
  const [showEvidenceList, setShowEvidenceList] = useState(false);
  // const [tune, setTune] = useState(DEFAULT_TUNE);   // TUNER
  // EVIDENCE TUNER: const [evidenceTune, setEvidenceTune] = useState({
  //   left: 7, bottom: 0, folderWidth: 17, folderHeight: 24, rotate: -7,
  // });
  const inputRef = useRef(null);

  const lastReply = [...entries].reverse().find((entry) => entry.role === "adrian");

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleAction = (action) => {
    setActiveAction(action);
    if (action === "ask") inputRef.current?.focus();
  };

  // Arrow keys move through the action menu from anywhere on the screen, but
  // never while the player is typing a question or a dialog is open.
  useEffect(() => {
    const order = ["ask", "accuse", "end"];

    const onKeyDown = (event) => {
      const isArrow = event.key === "ArrowUp" || event.key === "ArrowDown";
      if (!isArrow && event.key !== "Enter") return;

      const tag = document.activeElement?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (openEvidence) return;

      event.preventDefault();

      if (isArrow) {
        setActiveAction((current) => {
          const index = order.indexOf(current);
          const step = event.key === "ArrowDown" ? 1 : -1;
          return order[(index + step + order.length) % order.length];
        });
        return;
      }

      if (activeAction === "ask") inputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openEvidence, activeAction]);

  const handleSend = async () => {
    const trimmed = question.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError("");
    setEntries((prev) => [...prev, { role: "player", text: trimmed }]);
    setQuestion("");

    try {
      const result = await askQuestion(session.session_id, trimmed);
      setEntries((prev) => [...prev, { role: "adrian", text: result.response }]);
      setStress(result.stress);
      setMilestone(result.milestone);
      setEvidenceFound(result.evidence_found);
      if (result.prompts_left !== undefined) setPromptsLeft(result.prompts_left);
      if (result.status !== "ACTIVE") {
        onStatusChange({ ...session, ...result });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handlePresentEvidence = async (evidenceId) => {
    if (sending) return;
    const title = evidenceId.replace(/_/g, " ").toUpperCase();
    setSending(true);
    setError("");
    setEntries((prev) => [...prev, { role: "player", text: `[PRESENTED EVIDENCE: ${title}]` }]);
    try {
      const result = await askQuestion(session.session_id, `I am presenting ${title}. Explain this evidence.`);
      setEntries((prev) => [...prev, { role: "adrian", text: result.response }]);
      setStress(result.stress); setMilestone(result.milestone); setEvidenceFound(result.evidence_found);
      if (result.prompts_left !== undefined) setPromptsLeft(result.prompts_left);
      if (result.status !== "ACTIVE") onStatusChange({ ...session, ...result });
      setOpenEvidence(null);
    } catch (err) { setError(err.message); } finally { setSending(false); }
  };

  return (
    <div className="interrogation-screen">
      {/* TUNER: swap for <RoomStage stress={stress} tune={tune} /> when re-tuning */}
      <RoomStage stress={stress} />
      {/* TUNER: <SuspectTuner values={tune} onChange={setTune} /> */}

      <header className="hud-top">
        <div className="hud-brand">
          <span className="hud-brand-name">
            PROMPT<span className="start-x">X</span>
          </span>
          <small>INTERROGATION PROTOCOL v1.0.0</small>
        </div>

        <div className="hud-stress">
          <StressGauge stress={stress} />
        </div>

        <div className="hud-tagline">
          TRUTH
          <br />
          LIES
          <br />
          IN YOUR PROMPT.
        </div>
      </header>

      <section className="hud-panel hud-response">
        <div className="panel-title">// SUSPECT RESPONSE</div>
        <div className="hud-response-body">
          {lastReply ? (
            <p>{lastReply.text}</p>
          ) : (
            <p className="chat-empty">Awaiting your first question.</p>
          )}
          {sending && <p className="hud-thinking">...</p>}
        </div>
      </section>

      <section className="hud-panel hud-input">
        <label className="panel-title" htmlFor="question">
          // ENTER_INTERROGATION
        </label>
        <textarea
          id="question"
          ref={inputRef}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type your question..."
          maxLength={500}
          disabled={sending}
        />
        <button type="button" className="hud-send" onClick={handleSend} disabled={sending}>
          {sending ? "SENDING..." : "SEND"}
        </button>
        {error && <p className="error-text">{error}</p>}
      </section>

      {/* EVIDENCE TUNER: add tune={evidenceTune} when re-tuning */}
      <DeskEvidenceStack
        evidenceFound={evidenceFound}
        onOpen={setOpenEvidence}
        onOpenAll={() => setShowEvidenceList((open) => !open)}
      />
      {/* EVIDENCE TUNER: <EvidenceTuner values={evidenceTune} onChange={setEvidenceTune} /> */}

      <div className="hud-desk-sheet">
        <ActionBar active={activeAction} onSelect={handleAction} disabled={sending} />
      </div>

      {showEvidenceList && (
        <div className="hud-panel hud-evidence">
          <EvidencePanel evidenceFound={evidenceFound} onSelect={setOpenEvidence} />
        </div>
      )}

      {activeAction === "accuse" && (
        <section className="hud-panel hud-action-panel">
          <div className="panel-title">// FORMAL ACCUSATION</div>
          <p className="action-panel-body">
            An accusation is final. Name the contradiction you have proven — Adrian will
            not break on an unsupported claim.
          </p>
          <p className="action-panel-note">Milestones completed: {milestone}/5.</p>
          <button type="button" onClick={() => handleAction("ask")}>
            RETURN TO QUESTIONING
          </button>
        </section>
      )}

      {activeAction === "end" && (
        <section className="hud-panel hud-action-panel action-panel-warning">
          <div className="panel-title">// END SESSION</div>
          <p className="action-panel-body">
            Ending closes the interrogation. Progress is recorded as-is.
          </p>
          <div className="action-panel-actions">
            <button type="button" onClick={() => handleAction("ask")}>
              CANCEL
            </button>
            <button
              type="button"
              className="action-danger"
              onClick={() => onStatusChange({ ...session, status: "ENDED", stress })}
            >
              CONFIRM END
            </button>
          </div>
        </section>
      )}

      <footer className="hud-bottom">
        <div className="hud-footer-brand">
          <strong>PROMPT X</strong>
          <small>— TRUTH ALWAYS SURFACES</small>
        </div>
        <div className="hud-footer-stats">
          <span>
            TIME REMAINING <Timer secondsRemaining={secondsRemaining} inline />
          </span>
          <i className="hud-divider" />
          <span>
            PROMPTS LEFT <b>{promptsLeft}</b>
          </span>
          <i className="hud-divider" />
          <span>
            MILESTONE <b>{String(milestone).padStart(2, "0")}/05</b>
          </span>
        </div>
      </footer>

      {openEvidence && (
        <EvidenceFolder evidenceId={openEvidence} onClose={() => setOpenEvidence(null)} onPresent={handlePresentEvidence} presenting={sending} />
      )}
    </div>
  );
}
