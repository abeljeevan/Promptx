import { Canvas, useFrame } from "@react-three/fiber";
import { X, Send, RotateCcw, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Points } from "three";
import roomAsset from "../assets/interrogation-room.png";
import victimAsset from "../assets/meena-victim-file.png";
import victimFileProp from "../assets/victim-file-prop.png";
import accessEvidenceImg from "../assets/evidence/access.png";
import cctvEvidenceImg from "../assets/evidence/cctv.png";
import chatEvidenceImg from "../assets/evidence/chat.png";
import labEvidenceImg from "../assets/evidence/lab.png";
import phoneEvidenceImg from "../assets/evidence/phone.png";
import maintenanceEvidenceImg from "../assets/evidence/maintenance.png";
import noteEvidenceImg from "../assets/evidence/note.png";
import tokenEvidenceImg from "../assets/evidence/token.png";
import { InteractiveInvestigationObject } from "./InteractiveInvestigationObject";

// ---------------------------------------------------------------------------
// Backend configuration
// ---------------------------------------------------------------------------
const BACKEND_URL = "http://127.0.0.1:8010";


// Map UI suspect IDs → backend suspect IDs
const UI_TO_BACKEND: Record<SuspectId, string> = {
  noah: "noah_reed",
  daniel: "daniel_cross",
  elias: "elias_ward",
  leena: "leena_rao",
  ave: "ava_morgan",
};

// Map backend evidence IDs → UI evidence IDs
const BACKEND_EVIDENCE_TO_UI: Record<string, EvidenceId> = {
  emergency_message: "phone",
  door_sensor: "access",
  camera_blackout: "cctv",
  altered_dataset: "lab",
  missing_token: "token",
  maintenance_log: "maintenance",
  authentication_log: "access",
  witness_movement: "note",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SuspectId = "noah" | "daniel" | "elias" | "leena" | "ave";
type EvidenceId = "access" | "cctv" | "chat" | "lab" | "phone" | "maintenance" | "note" | "token";

type Suspect = {
  id: SuspectId;
  name: string;
  role: string;
  statement: string;
  position: string;
  mask: string;
  cycle: string;
  delay: string;
};

type Evidence = {
  id: EvidenceId;
  name: string;
  code: string;
  detail: string;
  finding: string;
  left: string;
  width: string;
  backendId: string;
  image: string;
};

// API response shapes
type SuspectApiData = {
  id: string;
  name: string;
  role: string;
  stress: number;
  stress_state: string;
  questions_used: number;
  questions_left: number;
  status: string;
};

type CaseProgress = {
  revealed_evidence: string[];
  proven_facts: string[];
  milestones: Record<string, boolean>;
  final_accusation_ready: boolean;
  solved: boolean;
};

type InterrogateResponse = {
  suspect: SuspectApiData;
  reply: string;
  pressure_delta: number;
  newly_revealed_evidence: string[];
  case: CaseProgress;
};

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const suspects: Suspect[] = [
  { id: "noah",   name: "NOAH REED",     role: "THE STUDENT",       statement: "I just focused on my work. That night, I was in the lab.",                            position: "suspect-noah",   mask: "polygon(47.6% 19.4%,61.4% 25%,59.9% 32.6%,66% 42.4%,100% 54.2%,100% 100%,0 100%,0 52.8%,23% 42.4%,24.6% 33.3%,9.2% 27.1%)",           cycle: "4.6s", delay: "-.7s"  },
  { id: "daniel", name: "DANIEL CROSS",  role: "THE PROFESSOR",     statement: "I saw someone near the chamber, but the storm made certainty impossible.",             position: "suspect-daniel", mask: "polygon(47% 20.1%,67% 23.6%,67% 33.3%,79.8% 41%,100% 45.1%,100% 100%,0 100%,0 47.2%,21.4% 40.3%,32.8% 32.6%,31.3% 22.9%)",                       cycle: "3.9s", delay: "-2.1s" },
  { id: "elias",  name: "ELIAS WIZARD",  role: "THE ADMINISTRATOR", statement: "Sensitive research was quarantined. That was procedure, not concealment.",            position: "suspect-elias",  mask: "polygon(52.4% 19.4%,67.4% 22.9%,67.4% 32.6%,87.4% 41.7%,100% 48.6%,100% 100%,0 100%,0 47.9%,12.5% 41.7%,32.5% 32.6%,32.5% 22.2%)",                              cycle: "4.9s", delay: "-1.3s" },
  { id: "leena",  name: "LEENA RAO",     role: "THE COLLEAGUE",     statement: "I didn't alter the dataset. I copied it because something was wrong.",                position: "suspect-leena",  mask: "polygon(52.7% 20.8%,74.1% 29.2%,82.6% 38.9%,92.6% 45.1%,100% 48.6%,100% 100%,0 100%,0 48.6%,8.5% 45.1%,17.1% 38.9%,25.6% 29.2%)",                              cycle: "4.2s", delay: "-3.2s" },
  { id: "ave",    name: "AVE MORGAN",    role: "THE FRIEND",        statement: "The camera failed. My token being used doesn't mean I was there.",                    position: "suspect-ave",    mask: "polygon(52.7% 20.1%,85.5% 32.6%,96.9% 45.1%,100% 48.6%,100% 100%,0 100%,0 47.2%,5.7% 41.7%,17.1% 31.9%)",                       cycle: "3.7s", delay: "-1.8s" },
];

const evidence: Evidence[] = [
  { id: "access",      name: "ACCESS CARD",     code: "E01", detail: "Restricted-area credential assigned to observatory personnel.",                                      finding: "A credential proves authorization—not who physically carried it.",                                                        left: "6.5%",  width: "9%",  backendId: "door_sensor",        image: accessEvidenceImg },
  { id: "cctv",        name: "CCTV FOOTAGE",    code: "E02", detail: "Observation-chamber camera feed, timestamped 02:11:03.",                                             finding: "The camera became unavailable at 02:11. The interruption does not identify who caused it.",                            left: "16%",   width: "10%", backendId: "camera_blackout",    image: cctvEvidenceImg },
  { id: "chat",        name: "CHAT LOGS",       code: "E03", detail: 'Messages: "you there?" — "we need to talk" — "it\'s serious..."',                                   finding: "Meena was attempting urgent contact shortly before the incident. The recipient is unclear.",                           left: "27%",   width: "10%", backendId: "emergency_message",  image: chatEvidenceImg },
  { id: "lab",         name: "LAB REPORT",      code: "E04", detail: "Confidential analysis of altered research and an unauthorized experiment.",                          finding: "This establishes motive only when connected to Meena's investigation.",                                              left: "38%",   width: "10%", backendId: "altered_dataset",    image: labEvidenceImg },
  { id: "phone",       name: "PHONE RECORDS",   code: "E05", detail: "Calls and attempted communications across the critical period.",                                     finding: "Phone activity shows contact timing, not physical location.",                                                         left: "49%",   width: "10%", backendId: "emergency_message",  image: phoneEvidenceImg },
  { id: "maintenance", name: "MAINTENANCE LOG", code: "E06", detail: "02:11 CamOverride · 02:12 Token AM-77 · 02:12 Secondary **** · 02:14 Transmission Queued",          finding: "The maintenance session required a second authorization. Ave's token alone was insufficient.",                       left: "60%",   width: "11%", backendId: "maintenance_log",    image: maintenanceEvidenceImg },
  { id: "note",        name: "NOTE FRAGMENT",   code: "E07", detail: '"Do not trust the person who says they saw me." / "The truth is behind the west door."',           finding: "The fragment undermines Daniel's certainty and points toward the west door.",                                         left: "72%",   width: "10%", backendId: "witness_movement",   image: noteEvidenceImg },
  { id: "token",       name: "METAL TOKEN",     code: "E08", detail: "Maintenance token AM-77, associated with Ave Morgan.",                                               finding: "Ownership does not prove use. Someone deliberately wanted this traced to Ave.",                                       left: "83.5%", width: "9%",  backendId: "missing_token",      image: tokenEvidenceImg },
];

const prompts = [
  "Where were you at 02:12?",
  "Why was the camera offline?",
  "Who provided the second authorization?",
  "Did you speak to Meena that night?",
  "Why was your workstation active?",
];

// ---------------------------------------------------------------------------
// Three.js atmosphere
// ---------------------------------------------------------------------------
function Atmosphere() {
  const ref = useRef<Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(240 * 3);
    for (let index = 0; index < values.length; index += 3) {
      values[index]     = ((index * 37) % 100) / 10 - 5;
      values[index + 1] = ((index * 71) % 100) / 10 - 5;
      values[index + 2] = ((index * 19) % 50)  / 10 - 2;
    }
    return values;
  }, []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.018;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#9bc18b" size={0.014} transparent opacity={0.28} sizeAttenuation />
    </points>
  );
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function apiInterrogate(suspectId: string, question: string): Promise<InterrogateResponse> {
  const res = await fetch(`${BACKEND_URL}/api/suspects/${suspectId}/interrogate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? "Interrogation request failed");
  }
  return res.json() as Promise<InterrogateResponse>;
}

async function apiPresentEvidence(suspectId: string, evidenceId: string): Promise<InterrogateResponse> {
  const res = await fetch(`${BACKEND_URL}/api/suspects/${suspectId}/present-evidence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evidence_id: evidenceId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? "Evidence presentation failed");
  }
  return res.json() as Promise<InterrogateResponse>;
}

async function apiGetSuspect(suspectId: string): Promise<SuspectApiData> {
  const res = await fetch(`${BACKEND_URL}/api/suspects/${suspectId}`);
  if (!res.ok) throw new Error("Failed to fetch suspect data");
  return res.json() as Promise<SuspectApiData>;
}

async function apiReset(): Promise<void> {
  await fetch(`${BACKEND_URL}/api/case/reset`, { method: "POST" });
}

// ---------------------------------------------------------------------------
// Main game component
// ---------------------------------------------------------------------------
const ROUND_SECONDS = 20 * 60;

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = String(Math.floor(safe / 60)).padStart(2, "0");
  const s = String(safe % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function SilentWitnessGame() {
  const [activeSuspect, setActiveSuspect] = useState<SuspectId | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceId | null>(null);
  const [victimOpen, setVictimOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [presenting, setPresenting] = useState(false);
  const [milestones, setMilestones] = useState<string[]>([]);
  const [stress, setStress] = useState<Record<SuspectId, number>>({ noah: 8, daniel: 5, elias: 4, leena: 6, ave: 7 });
  const [questionsLeft, setQuestionsLeft] = useState<Record<SuspectId, number>>({ noah: 10, daniel: 10, elias: 10, leena: 10, ave: 10 });
  const [stressLabel, setStressLabel] = useState<Record<SuspectId, string>>({ noah: "CALM", daniel: "CALM", elias: "CALM", leena: "CALM", ave: "CALM" });
  const [confessed, setConfessed] = useState(false);
  const [unsolved, setUnsolved] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(ROUND_SECONDS);
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);
  const [evidenceFileOpen, setEvidenceFileOpen] = useState(false);
  const [evidenceFileIndex, setEvidenceFileIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [revealedEvidence, setRevealedEvidence] = useState<Set<string>>(new Set());

  const suspect = suspects.find((item) => item.id === activeSuspect);
  const selectedEvidence = evidence.find((item) => item.id === activeEvidence);
  const progress = Math.min(100, milestones.length * 20);
  const evidenceFilePage = evidence[evidenceFileIndex];

  const gotoEvidencePage = useCallback((direction: 1 | -1) => {
    setEvidenceFileIndex((current) => (current + direction + evidence.length) % evidence.length);
  }, []);

  useEffect(() => {
    const closeExpandedView = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVictimOpen(false);
        setEvidenceFileOpen(false);
        return;
      }
      if (!evidenceFileOpen) return;
      if (event.key === "ArrowRight") gotoEvidencePage(1);
      if (event.key === "ArrowLeft") gotoEvidencePage(-1);
    };
    window.addEventListener("keydown", closeExpandedView);
    return () => window.removeEventListener("keydown", closeExpandedView);
  }, [evidenceFileOpen, gotoEvidencePage]);

  // 20-minute round timer — mirrors Adrian's case, but with its own longer budget.
  useEffect(() => {
    if (confessed || unsolved) return;
    const id = window.setInterval(() => {
      setSecondsRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [confessed, unsolved]);

  useEffect(() => {
    if (secondsRemaining === 0 && !confessed) {
      setUnsolved(true);
    }
  }, [secondsRemaining, confessed]);

  // Process API response and update all state
  const applyResponse = useCallback((data: InterrogateResponse, suspectUiId: SuspectId) => {
    setAnswer(data.reply);
    setStress((prev) => ({ ...prev, [suspectUiId]: data.suspect.stress }));
    setStressLabel((prev) => ({ ...prev, [suspectUiId]: data.suspect.stress_state }));
    setQuestionsLeft((prev) => ({ ...prev, [suspectUiId]: data.suspect.questions_left }));

    // Update milestones from case progress
    const newMilestones = Object.entries(data.case.milestones)
      .filter(([, v]) => v)
      .map(([k]) => k);
    setMilestones(newMilestones);

    // Update revealed evidence
    setRevealedEvidence(new Set(data.case.revealed_evidence));

    if (data.case.solved) {
      setConfessed(true);
    }
  }, []);

  const interrogate = useCallback(async (text: string) => {
    if (!activeSuspect || !text.trim() || loading) return;
    const backendId = UI_TO_BACKEND[activeSuspect];
    setLoading(true);
    setApiError(null);
    setQuestion("");

    try {
      if (presenting && selectedEvidence) {
        // Present evidence — does not consume a question
        const data = await apiPresentEvidence(backendId, selectedEvidence.backendId);
        applyResponse(data, activeSuspect);
      } else {
        // Ask a question
        const data = await apiInterrogate(backendId, text);
        applyResponse(data, activeSuspect);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection to backend failed. Is the server running on port 8001?";
      setApiError(msg);
      setAnswer("[ Connection error — see error panel ]");
    } finally {
      setLoading(false);
      setPresenting(false);
    }
  }, [activeSuspect, loading, presenting, selectedEvidence, applyResponse]);

  const selectSuspect = useCallback(async (id: SuspectId, defaultStatement: string) => {
    setActiveSuspect(id);
    setAnswer(defaultStatement);
    setApiError(null);
    setPresenting(false);

    // Fetch current suspect state from backend
    try {
      const data = await apiGetSuspect(UI_TO_BACKEND[id]);
      setStress((prev) => ({ ...prev, [id]: data.stress }));
      setStressLabel((prev) => ({ ...prev, [id]: data.stress_state }));
      setQuestionsLeft((prev) => ({ ...prev, [id]: data.questions_left }));
    } catch {
      // Non-fatal: fallback to current local state
    }
  }, []);

  const reset = useCallback(async () => {
    await apiReset().catch(() => {/* non-fatal */});
    setMilestones([]);
    setStress({ noah: 8, daniel: 5, elias: 4, leena: 6, ave: 7 });
    setStressLabel({ noah: "CALM", daniel: "CALM", elias: "CALM", leena: "CALM", ave: "CALM" });
    setQuestionsLeft({ noah: 10, daniel: 10, elias: 10, leena: 10, ave: 10 });
    setConfessed(false);
    setUnsolved(false);
    setSecondsRemaining(ROUND_SECONDS);
    setAnswer("");
    setActiveSuspect(null);
    setActiveEvidence(null);
    setApiError(null);
    setRevealedEvidence(new Set());
  }, []);

  return (
    <main className="case-shell">
      <Canvas className="case-atmosphere" camera={{ position: [0, 0, 5], fov: 55 }} dpr={1}>
        <Atmosphere />
      </Canvas>
      <div className="case-stage">
        <img src={roomAsset} alt="Five suspects seated in the Larkridge Observatory interrogation room" className="case-room" />
        <div className="case-vignette" />

        <header className="sw-hud-top">
          <div className="sw-hud-brand">
            <span className="sw-hud-brand-name">PROMPT<span className="sw-hud-brand-x">X</span></span>
            <small>THE SILENT WITNESS — INTERROGATION PROTOCOL</small>
          </div>
          <div className="sw-hud-progress" aria-label={`Case progress ${progress}%`}>
            <div className="sw-hud-progress-label">
              <span>CASE PROGRESS</span>
              <b>{String(progress).padStart(3, "0")}%</b>
            </div>
            <div className="sw-hud-progress-track"><span style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="sw-hud-meta">
            <span>LOCATION: LARKRIDGE OBSERVATORY</span>
            <span>CASE ID: SWD-001</span>
          </div>
        </header>

        {suspects.map((person) => (
          <InteractiveInvestigationObject
            key={person.id}
            id={person.id}
            label={`Interrogate ${person.name}`}
            activeId={hoveredObject}
            onActiveChange={setHoveredObject}
            className={`suspect-object ${person.position}`}
            mask={person.mask}
            sceneImage={roomAsset}
            cycle={person.cycle}
            delay={person.delay}
            onClick={() => { void selectSuspect(person.id, person.statement); }}
          />
        ))}

        <InteractiveInvestigationObject
          id="victim-file"
          label="Examine the victim file"
          activeId={hoveredObject}
          onActiveChange={setHoveredObject}
          className="table-prop table-prop--victim"
          mask="polygon(14% 7%,82% 0,98% 18%,89% 94%,8% 100%,0 23%)"
          onClick={() => setVictimOpen(true)}
        >
          <img src={victimFileProp} alt="" width={1024} height={768} draggable={false} />
        </InteractiveInvestigationObject>

        <InteractiveInvestigationObject
          id="evidence-file"
          label="Examine the evidence file"
          activeId={hoveredObject}
          onActiveChange={setHoveredObject}
          className="table-prop table-prop--evidence"
          mask="polygon(7% 28%,68% 0,100% 24%,91% 74%,31% 100%,0 72%)"
          sceneImage={roomAsset}
          cycle="5.2s"
          onClick={() => { setEvidenceFileIndex(0); setEvidenceFileOpen(true); }}
        />

        {evidence.map((item, index) => (
          <button
            key={item.id}
            aria-label={`Inspect ${item.name}`}
            className={`evidence-hit${revealedEvidence.has(item.backendId) ? " evidence-hit--revealed" : ""}`}
            style={{ left: item.left, width: item.width }}
            onClick={() => { setEvidenceFileIndex(index); setEvidenceFileOpen(true); }}
          />
        ))}

        <footer className="sw-hud-bottom">
          <div className="sw-hud-footer-brand">
            <strong>PROMPT X</strong>
            <small>— THE SILENT WITNESS</small>
          </div>
          <div className="sw-hud-footer-stats">
            <span>TIME REMAINING <b className={secondsRemaining <= 60 ? "sw-hud-time-critical" : ""}>{formatTime(secondsRemaining)}</b></span>
            <i className="sw-hud-divider" />
            <span>EVIDENCE <b>{String(revealedEvidence.size).padStart(2, "0")}/08</b></span>
            <i className="sw-hud-divider" />
            <span>MILESTONE <b>{String(milestones.length).padStart(2, "0")}/05</b></span>
            <i className="sw-hud-divider" />
            <span>CASE PROGRESS <b>{String(progress).padStart(3, "0")}%</b></span>
          </div>
        </footer>
      </div>

      {/* Victim file modal */}
      {victimOpen && (
        <div className="modal-backdrop document-backdrop" onClick={() => setVictimOpen(false)}>
          <section className="victim-modal document-view" onClick={(event) => event.stopPropagation()} aria-label="Victim file for Dr. Meena Sen">
            <button className="icon-button" onClick={() => setVictimOpen(false)} aria-label="Close victim file"><X /></button>
            <div className="document-image"><img src={victimAsset} alt="Victim file for Dr. Meena Sen" /></div>
            <div className="document-data">
              <small>[ VICTIM FILE // SWD-001 ]</small><h2>DR. MEENA SEN</h2><p className="document-role">PROJECT DIRECTOR / SENIOR RESEARCHER</p>
              <dl><div><dt>CASE STATUS</dt><dd>DECEASED</dd></div><div><dt>LOCATION</dt><dd>LARKRIDGE OBSERVATORY</dd></div><div><dt>LAST ACTIVITY</dt><dd>02:17 — POWER FLUCTUATION DETECTED</dd></div><div><dt>CAUSE</dt><dd>BLUNT-FORCE TRAUMA TO THE HEAD</dd></div></dl>
              <h3>CASE NOTES</h3><p>Meena discovered manipulated research linked to an unauthorized signal-processing experiment. She was preparing to expose the anomaly before her death.</p>
              <button className="terminal-button" onClick={() => setVictimOpen(false)}>CLOSE / RETURN</button>
            </div>
          </section>
        </div>
      )}

      {/* Evidence file modal — paginated, one evidence item per page */}
      {evidenceFileOpen && evidenceFilePage && (
        <div className="modal-backdrop document-backdrop" onClick={() => setEvidenceFileOpen(false)}>
          <section className="evidence-file-modal document-view" onClick={(event) => event.stopPropagation()} aria-label="Evidence file details">
            <button className="icon-button" onClick={() => setEvidenceFileOpen(false)} aria-label="Close evidence file"><X /></button>
            <div className="evidence-file-preview">
              <img src={evidenceFilePage.image} alt={evidenceFilePage.name} className="evidence-file-image" />
              <span className="evidence-file-tag">{evidenceFilePage.code} // EVIDENCE</span>
              <div className="evidence-file-pager">
                <button type="button" className="icon-button" onClick={() => gotoEvidencePage(-1)} aria-label="Previous evidence"><ChevronLeft /></button>
                <span>{String(evidenceFileIndex + 1).padStart(2, "0")} / {String(evidence.length).padStart(2, "0")}</span>
                <button type="button" className="icon-button" onClick={() => gotoEvidencePage(1)} aria-label="Next evidence"><ChevronRight /></button>
              </div>
            </div>
            <div className="document-data">
              <small>[ EVIDENCE DETAILS ]</small><h2>{evidenceFilePage.name}</h2><p className="document-role">CASE: MEENA SEN MURDER</p>
              <dl><div><dt>EVIDENCE ID</dt><dd>{evidenceFilePage.code}</dd></div><div><dt>TYPE</dt><dd>PHYSICAL / DIGITAL EVIDENCE</dd></div><div><dt>LOCATION</dt><dd>LARKRIDGE OBSERVATORY</dd></div><div><dt>STATUS</dt><dd>{revealedEvidence.has(evidenceFilePage.backendId) ? "EXAMINED" : "UNDER INVESTIGATION"}</dd></div><div><dt>ASSOCIATED</dt><dd>NOAH · DANIEL · ELIAS · LEENA · AVE</dd></div></dl>
              <h3>DESCRIPTION</h3><p>{evidenceFilePage.detail}</p>
              <h3>RELEVANCE / NOTES</h3><p>{evidenceFilePage.finding}</p>
              <div className="evidence-file-actions">
                <button type="button" className="terminal-button" onClick={() => gotoEvidencePage(-1)}><ChevronLeft size={16} /> PREV</button>
                <button type="button" className="terminal-button" onClick={() => setEvidenceFileOpen(false)}>CLOSE / RETURN</button>
                <button type="button" className="terminal-button" onClick={() => gotoEvidencePage(1)}>NEXT <ChevronRight size={16} /></button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Interrogation panel */}
      {suspect && (
        <aside className="interrogation-panel">
          <header>
            <div><small>// ACTIVE INTERROGATION</small><h2>{suspect.name}</h2><p>{suspect.role}</p></div>
            <button className="icon-button" onClick={() => { setActiveSuspect(null); setPresenting(false); setApiError(null); }} aria-label="Close interrogation"><X /></button>
          </header>
          <div className="stress-label">
            <span>PRESSURE / {stressLabel[suspect.id]}</span>
            <b>{stress[suspect.id]}%</b>
          </div>
          <div className="stress-track"><span style={{ width: `${stress[suspect.id]}%` }} /></div>
          <div className="questions-left-label">
            <span style={{ fontSize: ".62rem", color: "var(--case-muted)", letterSpacing: ".1em" }}>
              QUESTIONS LEFT: {questionsLeft[suspect.id]}/10
            </span>
          </div>

          {/* API Error state */}
          {apiError && (
            <div className="api-error-panel">
              <span>⚠ API ERROR</span>
              <p>{apiError}</p>
              <small>Make sure the backend is running: <code>py "second case/server.py"</code></small>
            </div>
          )}

          <div className="transcript">
            <span>{suspect.name}</span>
            {loading ? (
              <p style={{ display: "flex", alignItems: "center", gap: ".5rem", color: "var(--case-muted)", fontStyle: "italic" }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                thinking...
              </p>
            ) : (
              <p>{answer}</p>
            )}
          </div>

          <div className="quick-prompts">
            {prompts.map((prompt) => (
              <button key={prompt} onClick={() => { void interrogate(prompt); }} disabled={loading}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="evidence-select">
            <label>CONFRONT WITH EVIDENCE</label>
            <div>
              {evidence.map((item) => (
                <button
                  key={item.id}
                  className={activeEvidence === item.id && presenting ? "selected" : ""}
                  onClick={() => { setActiveEvidence(item.id); setPresenting(true); }}
                  title={item.name}
                  disabled={loading}
                >
                  {item.code}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void interrogate(question); }}>
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={presenting && selectedEvidence ? `Present ${selectedEvidence.name} and ask...` : "Type your question..."}
              disabled={loading}
            />
            <button className="send-button" type="submit" aria-label="Ask question" disabled={loading}>
              {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={18} />}
            </button>
          </form>
        </aside>
      )}

      {/* Confession / case closed / case unresolved screen — mirrors Adrian's
          Confession.jsx structure, in the darker Silent Witness palette. */}
      {(confessed || unsolved) && (
        <div className={`confession-screen${confessed ? "" : " confession-screen--unsolved"}`}>
          <p className="case-closed">{confessed ? "CASE CLOSED" : "CASE UNRESOLVED"}</p>
          <small>{confessed ? "NOAH REED HAS CONFESSED" : "20-MINUTE TIME LIMIT REACHED"}</small>

          {confessed && (
            <blockquote>
              {answer || "\"I made the workstation look active. I used Ave's token because I knew you'd look at her. The authorization came through my system. Meena found the data. She knew what I had done. I couldn't let her expose it.\""}
            </blockquote>
          )}

          {confessed ? (
            <dl>
              <div><dt>SUSPECT</dt><dd>Noah Reed</dd></div>
              <div><dt>VICTIM</dt><dd>Dr. Meena Sen</dd></div>
              <div><dt>LOCATION</dt><dd>Larkridge Observatory</dd></div>
              <div><dt>MOTIVE</dt><dd>Concealment of manipulated research</dd></div>
            </dl>
          ) : (
            <p className="confession-unsolved-note">
              The investigation ran out of time before the evidence chain against Noah could be closed.
              Review the case file and try again.
            </p>
          )}

          <p className="confession-meta">
            CASE PROGRESS {String(progress).padStart(3, "0")}% — MILESTONES {String(milestones.length).padStart(2, "0")}/05
            {!confessed && " — NO CONFESSION RECORDED"}
          </p>

          <button className="terminal-button" onClick={() => { void reset(); }}><RotateCcw size={16} /> REOPEN CASE</button>
        </div>
      )}
    </main>
  );
}