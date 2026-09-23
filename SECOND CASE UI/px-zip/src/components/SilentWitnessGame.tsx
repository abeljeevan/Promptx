import { Canvas, useFrame } from "@react-three/fiber";
import { X, Send, FileWarning, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Points } from "three";
import roomAsset from "../assets/interrogation-room.png";
import victimAsset from "../assets/meena-victim-file.png";
import victimFileProp from "../assets/victim-file-prop.png";
import { InteractiveInvestigationObject } from "./InteractiveInvestigationObject";

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
};

const suspects: Suspect[] = [
  { id: "noah", name: "NOAH REED", role: "THE STUDENT", statement: "I just focused on my work. That night, I was in the lab.", position: "suspect-noah", mask: "polygon(38% 2%,58% 0,74% 9%,79% 23%,72% 34%,87% 43%,98% 62%,94% 98%,4% 98%,0 64%,14% 42%,29% 34%,23% 19%)", cycle: "4.6s", delay: "-.7s" },
  { id: "daniel", name: "DANIEL CROSS", role: "THE PROFESSOR", statement: "I saw someone near the chamber, but the storm made certainty impossible.", position: "suspect-daniel", mask: "polygon(39% 1%,58% 1%,73% 12%,77% 29%,70% 38%,91% 51%,100% 96%,0 96%,5% 54%,29% 38%,24% 20%)", cycle: "3.9s", delay: "-2.1s" },
  { id: "elias", name: "ELIAS WIZARD", role: "THE ADMINISTRATOR", statement: "Sensitive research was quarantined. That was procedure, not concealment.", position: "suspect-elias", mask: "polygon(38% 2%,61% 1%,74% 13%,72% 34%,91% 47%,96% 96%,4% 96%,8% 48%,29% 35%,27% 14%)", cycle: "4.9s", delay: "-1.3s" },
  { id: "leena", name: "LEENA RAO", role: "THE COLLEAGUE", statement: "I didn't alter the dataset. I copied it because something was wrong.", position: "suspect-leena", mask: "polygon(37% 1%,62% 0,78% 16%,75% 35%,94% 52%,100% 97%,0 97%,5% 53%,25% 36%,23% 17%)", cycle: "4.2s", delay: "-3.2s" },
  { id: "ave", name: "AVE MORGAN", role: "THE FRIEND", statement: "The camera failed. My token being used doesn't mean I was there.", position: "suspect-ave", mask: "polygon(39% 0,60% 1%,76% 13%,82% 32%,73% 40%,94% 51%,100% 98%,0 98%,4% 51%,25% 39%,18% 20%)", cycle: "3.7s", delay: "-1.8s" },
];

const evidence: Evidence[] = [
  { id: "access", name: "ACCESS CARD", code: "E01", detail: "Restricted-area credential assigned to observatory personnel.", finding: "A credential proves authorization—not who physically carried it.", left: "6.5%", width: "9%" },
  { id: "cctv", name: "CCTV FOOTAGE", code: "E02", detail: "Observation-chamber camera feed, timestamped 02:11:03.", finding: "The camera became unavailable at 02:11. The interruption does not identify who caused it.", left: "16%", width: "10%" },
  { id: "chat", name: "CHAT LOGS", code: "E03", detail: "Messages: “you there?” — “we need to talk” — “it’s serious...”", finding: "Meena was attempting urgent contact shortly before the incident. The recipient is unclear.", left: "27%", width: "10%" },
  { id: "lab", name: "LAB REPORT", code: "E04", detail: "Confidential analysis of altered research and an unauthorized experiment.", finding: "This establishes motive only when connected to Meena's investigation.", left: "38%", width: "10%" },
  { id: "phone", name: "PHONE RECORDS", code: "E05", detail: "Calls and attempted communications across the critical period.", finding: "Phone activity shows contact timing, not physical location.", left: "49%", width: "10%" },
  { id: "maintenance", name: "MAINTENANCE LOG", code: "E06", detail: "02:11 CamOverride · 02:12 Token AM-77 · 02:12 Secondary **** · 02:14 Transmission Queued", finding: "The maintenance session required a second authorization. Ave's token alone was insufficient.", left: "60%", width: "11%" },
  { id: "note", name: "NOTE FRAGMENT", code: "E07", detail: "“Do not trust the person who says they saw me.” / “The truth is behind the west door.”", finding: "The fragment undermines Daniel's certainty and points toward the west door.", left: "72%", width: "10%" },
  { id: "token", name: "METAL TOKEN", code: "E08", detail: "Maintenance token AM-77, associated with Ave Morgan.", finding: "Ownership does not prove use. Someone deliberately wanted this traced to Ave.", left: "83.5%", width: "9%" },
];

const prompts = [
  "Where were you at 02:12?",
  "Why was the camera offline?",
  "Who provided the second authorization?",
  "Did you speak to Meena that night?",
  "Why was your workstation active?",
];

const keyFor = (suspect: SuspectId, text: string, proof?: EvidenceId) => {
  const q = text.toLowerCase();
  if (q.includes("02:12") || q.includes("2:12") || q.includes("where were")) return "timeline";
  if (q.includes("camera") || proof === "cctv") return "location";
  if (q.includes("meena") || q.includes("speak") || proof === "chat" || proof === "phone") return "contact";
  if (q.includes("authoriz") || proof === "maintenance" || proof === "token") return "authorization";
  if (suspect === "noah" && (q.includes("workstation") || proof === "access")) return "contradiction";
  return undefined;
};

function Atmosphere() {
  const ref = useRef<Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(240 * 3);
    for (let index = 0; index < values.length; index += 3) {
      values[index] = ((index * 37) % 100) / 10 - 5;
      values[index + 1] = ((index * 71) % 100) / 10 - 5;
      values[index + 2] = ((index * 19) % 50) / 10 - 2;
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

export function SilentWitnessGame() {
  const [activeSuspect, setActiveSuspect] = useState<SuspectId | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceId | null>(null);
  const [victimOpen, setVictimOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [presenting, setPresenting] = useState(false);
  const [milestones, setMilestones] = useState<string[]>([]);
  const [stress, setStress] = useState<Record<SuspectId, number>>({ noah: 8, daniel: 5, elias: 4, leena: 6, ave: 7 });
  const [confessed, setConfessed] = useState(false);
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);
  const [evidenceFileOpen, setEvidenceFileOpen] = useState(false);
  const suspect = suspects.find((item) => item.id === activeSuspect);
  const selectedEvidence = evidence.find((item) => item.id === activeEvidence);
  const progress = milestones.length * 20;

  useEffect(() => {
    const closeExpandedView = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setVictimOpen(false);
      setEvidenceFileOpen(false);
    };
    window.addEventListener("keydown", closeExpandedView);
    return () => window.removeEventListener("keydown", closeExpandedView);
  }, []);

  const interrogate = (text: string) => {
    if (!activeSuspect || !text.trim()) return;
    const proof = presenting ? activeEvidence ?? undefined : undefined;
    const key = keyFor(activeSuspect, text, proof);
    if (key && !milestones.includes(key)) setMilestones((current) => [...current, key]);
    const increment = key ? (proof ? 18 : 11) : 4;
    const nextStress = Math.min(100, stress[activeSuspect] + increment);
    setStress((current) => ({ ...current, [activeSuspect]: nextStress }));

    if (activeSuspect === "noah") {
      if (nextStress >= 100 && milestones.length >= 4) {
        setConfessed(true);
        setAnswer("Enough. The account wasn't me—it was prepared. I used Ave's token because I knew you'd look at her. The authorization came through my system. Meena found the altered data. I couldn't let her expose it.");
      } else if (proof === "maintenance") {
        setAnswer("A maintenance session can be authorized through several routes. Ave had the token. Elias had clearance. That log doesn't place me there.");
      } else if (proof === "token") {
        setAnswer("It belongs to Ave. You're asking me to explain someone else's credential.");
      } else if (proof === "cctv") {
        setAnswer("A failed camera proves only that a camera failed. I was at my workstation.");
      } else if (text.toLowerCase().includes("workstation")) {
        setAnswer("My account was active from 02:03 to 02:16. The system records are clear.");
      } else {
        setAnswer("I was in communications. If you have a contradiction, show me the record.");
      }
    } else {
      const reactions: Record<SuspectId, string> = {
        noah: "",
        daniel: proof === "note" ? "I did see someone—but not their face. The jacket looked like maintenance gear." : "Visibility was poor. I was closer to the chamber than I first admitted.",
        elias: proof === "lab" ? "I ordered the files quarantined to protect the institution. I did not order Meena harmed." : "I knew about irregularities. Administrative caution is not murder.",
        leena: proof === "lab" || proof === "access" ? "I copied the dataset because the values had been manipulated. Meena and I were tracing the anomaly." : "I was investigating the research, not destroying it.",
        ave: proof === "token" || proof === "maintenance" ? "AM-77 is mine, but I didn't use it. And that session still needed a second authorization." : "I found the camera fault. Someone knew the maintenance system well enough to frame me.",
      };
      setAnswer(reactions[activeSuspect]);
    }
    setQuestion("");
    setPresenting(false);
  };

  const reset = () => {
    setMilestones([]);
    setStress({ noah: 8, daniel: 5, elias: 4, leena: 6, ave: 7 });
    setConfessed(false);
    setAnswer("");
    setActiveSuspect(null);
    setActiveEvidence(null);
  };

  return (
    <main className="case-shell">
      <Canvas className="case-atmosphere" camera={{ position: [0, 0, 5], fov: 55 }} dpr={1}>
        <Atmosphere />
      </Canvas>
      <div className="case-stage">
        <img src={roomAsset} alt="Five suspects seated in the Larkridge Observatory interrogation room" className="case-room" />
        <div className="case-vignette" />

        <div className="progress-hit" aria-label={`Case progress ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>

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
            onClick={() => { setActiveSuspect(person.id); setAnswer(person.statement); }}
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
          onClick={() => setEvidenceFileOpen(true)}
        />

        {evidence.map((item) => (
          <button
            key={item.id}
            aria-label={`Inspect ${item.name}`}
            className="evidence-hit"
            style={{ left: item.left, width: item.width }}
            onClick={() => setActiveEvidence(item.id)}
          />
        ))}

        <div className="case-status">
          <span>CASE PROGRESS {String(progress).padStart(3, "0")}%</span>
          <span>MILESTONE {String(milestones.length).padStart(2, "0")}/05</span>
        </div>
      </div>

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

      {evidenceFileOpen && (
        <div className="modal-backdrop document-backdrop" onClick={() => setEvidenceFileOpen(false)}>
          <section className="evidence-file-modal document-view" onClick={(event) => event.stopPropagation()} aria-label="Evidence file details">
            <button className="icon-button" onClick={() => setEvidenceFileOpen(false)} aria-label="Close evidence file"><X /></button>
            <div className="evidence-file-preview"><span>RESTRICTED</span><b>EVIDENCE</b><small>CASE // SWD-001</small></div>
            <div className="document-data">
              <small>[ EVIDENCE DETAILS ]</small><h2>{selectedEvidence?.name ?? "CASE EVIDENCE"}</h2><p className="document-role">CASE: MEENA SEN MURDER</p>
              <dl><div><dt>EVIDENCE ID</dt><dd>{selectedEvidence?.code ?? "EV-001—008"}</dd></div><div><dt>TYPE</dt><dd>PHYSICAL / DIGITAL EVIDENCE</dd></div><div><dt>LOCATION</dt><dd>LARKRIDGE OBSERVATORY</dd></div><div><dt>STATUS</dt><dd>UNDER INVESTIGATION</dd></div><div><dt>ASSOCIATED</dt><dd>NOAH · DANIEL · ELIAS · LEENA · AVE</dd></div></dl>
              <h3>DESCRIPTION</h3><p>{selectedEvidence?.detail ?? "Eight recovered items establish the access, surveillance, communication, and authorization chain surrounding the observation chamber."}</p>
              <h3>RELEVANCE / NOTES</h3><p>{selectedEvidence?.finding ?? "No single item proves guilt. Compare the maintenance session, secondary authorization, workstation activity, and physical access."}</p>
              <button className="terminal-button" onClick={() => setEvidenceFileOpen(false)}>CLOSE / RETURN</button>
            </div>
          </section>
        </div>
      )}

      {selectedEvidence && !activeSuspect && (
        <div className="modal-backdrop" onClick={() => setActiveEvidence(null)}>
          <section className="evidence-modal" onClick={(event) => event.stopPropagation()}>
            <header><span>{selectedEvidence.code} // EVIDENCE</span><button className="icon-button" onClick={() => setActiveEvidence(null)} aria-label="Close evidence"><X /></button></header>
            <p className="evidence-name">{selectedEvidence.name}</p>
            <p>{selectedEvidence.detail}</p>
            <div className="finding"><FileWarning size={20} /><span>{selectedEvidence.finding}</span></div>
            <button className="terminal-button" onClick={() => { setPresenting(true); setActiveEvidence(selectedEvidence.id); setActiveSuspect("noah"); setAnswer("Present the record. I'll explain what it actually proves."); }}>PRESENT TO NOAH</button>
          </section>
        </div>
      )}

      {suspect && (
        <aside className="interrogation-panel">
          <header>
            <div><small>// ACTIVE INTERROGATION</small><h2>{suspect.name}</h2><p>{suspect.role}</p></div>
            <button className="icon-button" onClick={() => { setActiveSuspect(null); setPresenting(false); }} aria-label="Close interrogation"><X /></button>
          </header>
          <div className="stress-label"><span>PRESSURE / NOT GUILT</span><b>{stress[suspect.id]}%</b></div>
          <div className="stress-track"><span style={{ width: `${stress[suspect.id]}%` }} /></div>
          <div className="transcript"><span>{suspect.name}</span><p>{answer}</p></div>
          <div className="quick-prompts">
            {prompts.map((prompt) => <button key={prompt} onClick={() => interrogate(prompt)}>{prompt}</button>)}
          </div>
          <div className="evidence-select">
            <label>CONFRONT WITH EVIDENCE</label>
            <div>
              {evidence.map((item) => (
                <button key={item.id} className={activeEvidence === item.id && presenting ? "selected" : ""} onClick={() => { setActiveEvidence(item.id); setPresenting(true); }} title={item.name}>{item.code}</button>
              ))}
            </div>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); interrogate(question); }}>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={presenting && selectedEvidence ? `Present ${selectedEvidence.name} and ask...` : "Type your question..."} />
            <button className="send-button" type="submit" aria-label="Ask question"><Send size={18} /></button>
          </form>
        </aside>
      )}

      {confessed && (
        <div className="confession-screen">
          <p className="case-closed">CASE CLOSED</p>
          <small>NOAH REED HAS CONFESSED</small>
          <blockquote>“I made the workstation look active. I used Ave's token because I knew you'd look at her. The authorization came through my system. Meena found the data. She knew what I had done. I couldn't let her expose it.”</blockquote>
          <dl><div><dt>SUSPECT</dt><dd>Noah Reed</dd></div><div><dt>VICTIM</dt><dd>Dr. Meena Sen</dd></div><div><dt>LOCATION</dt><dd>Larkridge Observatory</dd></div><div><dt>MOTIVE</dt><dd>Concealment of manipulated research</dd></div></dl>
          <button className="terminal-button" onClick={reset}><RotateCcw size={16} /> REOPEN CASE</button>
        </div>
      )}
    </main>
  );
}