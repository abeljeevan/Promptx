import { Canvas, useFrame } from "@react-three/fiber";
import { X, Send, RotateCcw, Loader2, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Points } from "three";
import roomAsset from "../assets/interrogation-room.png";
import victimAsset from "../assets/meena-victim-file.png";
import victimFileProp from "../assets/victim-file-prop.png";
// Adrian's case evidence folder, trimmed to the stack, so both cases share the prop.
import evidenceStackProp from "../assets/evidence-stack-prop.png";
import noahPhoto from "../assets/suspects/noah.jpeg";
import danielPhoto from "../assets/suspects/daniel.jpeg";
import eliasPhoto from "../assets/suspects/elias.jpeg";
import leenaPhoto from "../assets/suspects/leena.jpeg";
import avePhoto from "../assets/suspects/ave.jpeg";
import accessEvidenceImg from "../assets/evidence/access.png";
import cctvEvidenceImg from "../assets/evidence/cctv.png";
import chatEvidenceImg from "../assets/evidence/chat.png";
import labEvidenceImg from "../assets/evidence/lab.png";
import phoneEvidenceImg from "../assets/evidence/phone.png";
import maintenanceEvidenceImg from "../assets/evidence/maintenance.png";
import noteEvidenceImg from "../assets/evidence/note.png";
import tokenEvidenceImg from "../assets/evidence/token.png";
import { InteractiveInvestigationObject } from "./InteractiveInvestigationObject";
import { BackgroundMusic } from "./BackgroundMusic";

// ---------------------------------------------------------------------------
// Backend configuration
// ---------------------------------------------------------------------------
// In production this app is merged onto Case 1's domain under /case2, so its
// own /api/* calls are prefixed the same way to avoid colliding with Case 1's
// /api/* (Netlify proxies /case2/api/* to the backend — see netlify.toml).
// Locally it points straight at the dev server.
const BACKEND_URL = import.meta.env.DEV ? "http://127.0.0.1:8010" : "/case2";


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
  photo: string;
  // Horizontal centre of the seat, as a % of the stage, for the hover photo card.
  centre: number;
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
  current_score: number;
};

type InterrogateResponse = {
  suspect: SuspectApiData;
  reply: string;
  pressure_delta: number;
  newly_revealed_evidence: string[];
  case: CaseProgress;
};

type CaseSnapshot = {
  progress: CaseProgress;
  seconds_remaining: number;
};

type ScoreBreakdown = {
  milestones: number;
  evidence: number;
  solved: number;
  efficiency: number;
  time: number;
  total: number;
};

type CaseResult = {
  case1_score: number | null;
  case2_score: number;
  breakdown: ScoreBreakdown;
  total_score: number;
  solved: boolean;
  time_taken: number;
  questions_used: number;
};

type LeaderboardRow = {
  promo_code: string;
  case1_score: number | null;
  case2_score: number | null;
  case2_solved: number | null;
  total_score: number;
  total_time: number;
  rank: number;
};

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const suspects: Suspect[] = [
  { id: "noah",   name: "NOAH REED",     role: "THE STUDENT",       statement: "I just focused on my work. That night, I was in the lab.",                            position: "suspect-noah",   mask: "polygon(47.6% 19.4%,61.4% 25%,59.9% 32.6%,66% 42.4%,100% 54.2%,100% 100%,0 100%,0 52.8%,23% 42.4%,24.6% 33.3%,9.2% 27.1%)",           photo: noahPhoto,   centre: 9.5 },
  { id: "daniel", name: "DANIEL CROSS",  role: "THE PROFESSOR",     statement: "I saw someone near the chamber, but the storm made certainty impossible.",             position: "suspect-daniel", mask: "polygon(47% 20.1%,67% 23.6%,67% 33.3%,79.8% 41%,100% 45.1%,100% 100%,0 100%,0 47.2%,21.4% 40.3%,32.8% 32.6%,31.3% 22.9%)",                       photo: danielPhoto, centre: 30 },
  { id: "elias",  name: "ELIAS WIZARD",  role: "THE ADMINISTRATOR", statement: "Sensitive research was quarantined. That was procedure, not concealment.",            position: "suspect-elias",  mask: "polygon(52.4% 19.4%,67.4% 22.9%,67.4% 32.6%,87.4% 41.7%,100% 48.6%,100% 100%,0 100%,0 47.9%,12.5% 41.7%,32.5% 32.6%,32.5% 22.2%)",                              photo: eliasPhoto,  centre: 50 },
  { id: "leena",  name: "LEENA RAO",     role: "THE COLLEAGUE",     statement: "I didn't alter the dataset. I copied it because something was wrong.",                position: "suspect-leena",  mask: "polygon(52.7% 20.8%,74.1% 29.2%,82.6% 38.9%,92.6% 45.1%,100% 48.6%,100% 100%,0 100%,0 48.6%,8.5% 45.1%,17.1% 38.9%,25.6% 29.2%)",                              photo: leenaPhoto,  centre: 69 },
  { id: "ave",    name: "AVE MORGAN",    role: "THE FRIEND",        statement: "The camera failed. My token being used doesn't mean I was there.",                    position: "suspect-ave",    mask: "polygon(52.7% 20.1%,85.5% 32.6%,96.9% 45.1%,100% 48.6%,100% 100%,0 100%,0 47.2%,5.7% 41.7%,17.1% 31.9%)",                       photo: avePhoto,    centre: 91 },
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
// The participant code from Adrian's case arrives as ?code= on the NEXT CASE
// link. It is kept for the tab's lifetime so a reload stays on the same case.
const PLAYER_CODE_KEY = "px-player-code";

function readPlayerCode(): string {
  if (typeof window === "undefined") return "";
  const fromUrl = new URLSearchParams(window.location.search).get("code")?.trim();
  try {
    if (fromUrl) sessionStorage.setItem(PLAYER_CODE_KEY, fromUrl);
    return fromUrl || sessionStorage.getItem(PLAYER_CODE_KEY) || "";
  } catch {
    return fromUrl || "";
  }
}

let playerCode = "";

async function api<T>(path: string, init: RequestInit = {}, failure = "Request failed"): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Player-Code": playerCode, ...init.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? failure);
  }
  return res.json() as Promise<T>;
}

const apiInterrogate = (suspectId: string, question: string) =>
  api<InterrogateResponse>(`/api/suspects/${suspectId}/interrogate`,
    { method: "POST", body: JSON.stringify({ question }) }, "Interrogation request failed");

const apiPresentEvidence = (suspectId: string, evidenceId: string) =>
  api<InterrogateResponse>(`/api/suspects/${suspectId}/present-evidence`,
    { method: "POST", body: JSON.stringify({ evidence_id: evidenceId }) }, "Evidence presentation failed");

const apiGetSuspect = (suspectId: string) =>
  api<SuspectApiData>(`/api/suspects/${suspectId}`, {}, "Failed to fetch suspect data");

const apiGetSuspects = () => api<{ suspects: SuspectApiData[] }>("/api/suspects");
const apiGetCase = () => api<CaseSnapshot>("/api/case");
const apiGetPlayer = () => api<{ case1_score: number | null }>("/api/player");
const apiSubmitResult = () => api<CaseResult>("/api/case/result", { method: "POST" }, "Failed to save result");
const apiLeaderboard = () => api<{ leaderboard: LeaderboardRow[]; me: LeaderboardRow | null }>("/api/leaderboard");

async function apiReset(): Promise<void> {
  await api("/api/case/reset", { method: "POST" });
}

const BACKEND_TO_UI_SUSPECT = Object.fromEntries(
  Object.entries(UI_TO_BACKEND).map(([ui, backend]) => [backend, ui]),
) as Record<string, SuspectId>;

function completedMilestones(progress: CaseProgress): string[] {
  return Object.entries(progress.milestones).filter(([, done]) => done).map(([name]) => name);
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

// Mirrors calculate_case2_score in second case/server.py.
const SCORE_LINES: [keyof Omit<ScoreBreakdown, "total">, string, number][] = [
  ["milestones", "MILESTONES PROVEN", 40],
  ["evidence", "EVIDENCE UNCOVERED", 20],
  ["solved", "CONFESSION", 20],
  ["efficiency", "QUESTION EFFICIENCY", 10],
  ["time", "TIME REMAINING", 10],
];

// Both cases added together: best Adrian Vale score + best Silent Witness score.
function LeaderboardView({ code, onClose }: { code: string; onClose: () => void }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [me, setMe] = useState<LeaderboardRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiLeaderboard()
      .then((data) => { setRows(data.leaderboard); setMe(data.me); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the leaderboard"));
  }, []);

  const isMe = (row: LeaderboardRow) => row.promo_code.toUpperCase() === code.toUpperCase();
  const meListed = rows?.some(isMe);

  return (
    <div className="modal-backdrop leaderboard-backdrop" onClick={onClose}>
      <section className="leaderboard-view" onClick={(event) => event.stopPropagation()} aria-label="Leaderboard">
        <header>
          <div><small>// COMBINED STANDINGS — CASE 1 + CASE 2</small><h2>LEADERBOARD</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close leaderboard"><X /></button>
        </header>
        {error && <p className="leaderboard-empty">{error}</p>}
        {!error && !rows && <p className="leaderboard-empty">LOADING STANDINGS…</p>}
        {rows && rows.length === 0 && <p className="leaderboard-empty">NO RESULTS YET.</p>}
        {rows && rows.length > 0 && (
          <table className="leaderboard-table">
            <thead>
              <tr><th>#</th><th>CODE</th><th>CASE 1</th><th>CASE 2</th><th>TOTAL</th><th>TIME</th></tr>
            </thead>
            <tbody>
              {[...rows, ...(me && !meListed ? [me] : [])].map((row) => (
                <tr key={row.promo_code} className={isMe(row) ? "leaderboard-me" : undefined}>
                  <td>{row.rank}</td>
                  <td>{row.promo_code}</td>
                  <td>{row.case1_score ?? "—"}</td>
                  <td>{row.case2_score ?? "—"}</td>
                  <td><b>{row.total_score}</b></td>
                  <td>{formatTime(row.total_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {me && <p className="leaderboard-rank">YOUR RANK: <b>#{me.rank}</b> — {me.total_score} POINTS</p>}
        <button className="terminal-button" onClick={onClose}>CLOSE / RETURN</button>
      </section>
    </div>
  );
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
  const [code, setCode] = useState<string>(() => readPlayerCode());
  const [codeDraft, setCodeDraft] = useState("");
  const [case1Score, setCase1Score] = useState<number | null>(null);
  const [case2Score, setCase2Score] = useState(0);
  const [result, setResult] = useState<CaseResult | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const submitting = useRef(false);

  // Declared before the other effects so every request carries the code.
  useEffect(() => {
    playerCode = code;
  }, [code]);

  // Pick up this player's case where the server has it: clock, progress,
  // suspects, and the points carried in from Adrian's case.
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void (async () => {
      try {
        const [snapshot, roster, player] = await Promise.all([apiGetCase(), apiGetSuspects(), apiGetPlayer()]);
        if (cancelled) return;
        setSecondsRemaining(snapshot.seconds_remaining);
        setMilestones(completedMilestones(snapshot.progress));
        setRevealedEvidence(new Set(snapshot.progress.revealed_evidence));
        setConfessed(snapshot.progress.solved);
        setUnsolved(!snapshot.progress.solved && snapshot.seconds_remaining === 0);
        setCase1Score(player.case1_score);
        setCase2Score(snapshot.progress.current_score);
        for (const item of roster.suspects) {
          const id = BACKEND_TO_UI_SUSPECT[item.id];
          if (!id) continue;
          setStress((prev) => ({ ...prev, [id]: item.stress }));
          setStressLabel((prev) => ({ ...prev, [id]: item.stress_state }));
          setQuestionsLeft((prev) => ({ ...prev, [id]: item.questions_left }));
        }
      } catch (err) {
        if (!cancelled) setApiError(err instanceof Error ? err.message : "Could not reach the case server.");
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

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
        setLeaderboardOpen(false);
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
    if (!code || confessed || unsolved) return;
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

  // Score the finished case once. The server works the score out from its own
  // state; a repeat call (e.g. after a reload) returns the same result.
  const submitResult = useCallback(async () => {
    if (submitting.current) return;
    submitting.current = true;
    setResultError(null);
    try {
      setResult(await apiSubmitResult());
    } catch (err) {
      setResultError(err instanceof Error ? err.message : "Failed to save result");
      submitting.current = false;
    }
  }, []);

  useEffect(() => {
    if (code && (confessed || unsolved) && !result) void submitResult();
  }, [code, confessed, unsolved, result, submitResult]);

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

    setCase2Score(data.case.current_score);

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
    setResult(null);
    setResultError(null);
    setLeaderboardOpen(false);
    submitting.current = false;
  }, []);

  // The tense loop runs for the whole investigation and stops when the case
  // ends; a solved case plays the same case-solved sting as Adrian's case.
  const music = confessed
    ? { src: "/audio/case-solved.mp3", loop: false, label: "case solved theme" }
    : unsolved
      ? null
      : { src: "/audio/silent-witness-loop.mp3", loop: true, label: "Silent Witness soundtrack" };

  return (
    <main className="case-shell">
      {music && <BackgroundMusic key={music.src} {...music} />}
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
            onClick={() => { void selectSuspect(person.id, person.statement); }}
          />
        ))}

        {/* Hovering a suspect lifts their photo card above the seat (not for the
            one being interrogated — the panel already shows their photo). */}
        {suspects.map((person) => (
          <figure
            key={person.id}
            className={`suspect-card${hoveredObject === person.id && activeSuspect !== person.id ? " suspect-card--visible" : ""}`}
            style={{ left: `${person.centre}%` }}
            aria-hidden="true"
          >
            <img src={person.photo} alt="" draggable={false} />
            <figcaption><b>{person.name}</b><span>{person.role}</span></figcaption>
          </figure>
        ))}

        <InteractiveInvestigationObject
          id="victim-file"
          label="Open the victim file"
          activeId={hoveredObject}
          onActiveChange={setHoveredObject}
          className="table-prop table-prop--victim"
          onClick={() => setVictimOpen(true)}
        >
          <img src={victimFileProp} alt="" width={1024} height={768} draggable={false} />
        </InteractiveInvestigationObject>

        <InteractiveInvestigationObject
          id="evidence-file"
          label="Open the evidence file"
          activeId={hoveredObject}
          onActiveChange={setHoveredObject}
          className="table-prop table-prop--evidence"
          onClick={() => { setEvidenceFileIndex(0); setEvidenceFileOpen(true); }}
        >
          <img src={evidenceStackProp} alt="" width={610} height={439} draggable={false} />
        </InteractiveInvestigationObject>

        {/* Same pin-and-label language as the suspect markers in the scene, so
            the two files read as things to click. */}
        {([
          ["victim-file", "table-marker--victim", "VICTIM FILE"],
          ["evidence-file", "table-marker--evidence", "EVIDENCE FILE"],
        ] as const).map(([id, position, title]) => (
          <span
            key={id}
            className={`table-marker ${position}${hoveredObject === id ? " table-marker--active" : ""}`}
            aria-hidden="true"
          >
            <i />
            <b>{title}</b>
            <small>CLICK TO OPEN</small>
          </span>
        ))}

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
            {case1Score !== null && (
              <>
                <span title="Points carried over from Adrian's case">CASE 1 POINTS <b>{String(case1Score).padStart(3, "0")}</b></span>
                <i className="sw-hud-divider" />
              </>
            )}
            <span title="Live estimate — finalizes on accusation or time-out">CASE 2 SCORE <b>{String(case2Score).padStart(3, "0")}</b></span>
            <i className="sw-hud-divider" />
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
            <div className="interrogation-id">
              <img src={suspect.photo} alt={suspect.name} className="interrogation-photo" />
              <div><small>// ACTIVE INTERROGATION</small><h2>{suspect.name}</h2><p>{suspect.role}</p></div>
            </div>
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

          {result && (
            <section className="score-card" aria-label="Score">
              <div className="score-card-totals">
                <div><span>CASE 1 · ADRIAN VALE</span><b>{result.case1_score ?? "—"}</b></div>
                <i>+</i>
                <div><span>CASE 2 · SILENT WITNESS</span><b>{result.case2_score}</b></div>
                <i>=</i>
                <div className="score-card-total"><span>TOTAL</span><b>{result.total_score}</b></div>
              </div>
              <ul className="score-card-breakdown">
                {SCORE_LINES.map(([key, label, max]) => (
                  <li key={key}><span>{label}</span><b>{result.breakdown[key]}/{max}</b></li>
                ))}
              </ul>
              {result.case1_score === null && (
                <p className="score-card-note">No Adrian Vale result found for {code} — only this case counts toward the total.</p>
              )}
            </section>
          )}
          {!result && !resultError && <p className="confession-meta">SCORING CASE…</p>}
          {resultError && (
            <p className="score-card-error">
              {resultError} <button type="button" onClick={() => { void submitResult(); }}>RETRY</button>
            </p>
          )}

          <div className="confession-actions">
            <button className="terminal-button" onClick={() => setLeaderboardOpen(true)}><Trophy size={16} /> VIEW LEADERBOARD</button>
            <button className="terminal-button" onClick={() => { void reset(); }}><RotateCcw size={16} /> REOPEN CASE</button>
          </div>
        </div>
      )}

      {leaderboardOpen && <LeaderboardView code={code} onClose={() => setLeaderboardOpen(false)} />}

      {/* Players normally arrive from Adrian's case with their code in the
          link; anyone opening this page directly is asked for it. */}
      {!code && (
        <div className="code-gate">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const value = codeDraft.trim();
              if (!value) return;
              try { sessionStorage.setItem(PLAYER_CODE_KEY, value); } catch { /* per-tab only */ }
              setCode(value);
            }}
          >
            <small>[ THE SILENT WITNESS // SWD-001 ]</small>
            <h2>ENTER YOUR PARTICIPANT CODE</h2>
            <p>Use the same code as Adrian Vale's case so both scores add up on the leaderboard.</p>
            <input value={codeDraft} onChange={(event) => setCodeDraft(event.target.value)} placeholder="PX-001" autoFocus />
            <button className="terminal-button" type="submit">BEGIN INVESTIGATION</button>
          </form>
        </div>
      )}
    </main>
  );
}