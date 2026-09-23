import { useState } from "react";
import { Start } from "./pages/Start";
import { Interrogation } from "./pages/Interrogation";
import { Confession } from "./pages/Confession";
import { Leaderboard } from "./pages/Leaderboard";
import { NextCaseIntro } from "./pages/NextCaseIntro";
import { BackgroundMusic } from "./components/BackgroundMusic";
import "./styles/tokens.css";
import "./styles/app.css";

// "The Silent Witness" frontend (SECOND CASE UI/px-zip) runs on :8080 in dev.
// Set VITE_SILENT_WITNESS_URL to point the intro's PLAY button somewhere else.
const SILENT_WITNESS_URL = import.meta.env.VITE_SILENT_WITNESS_URL || "http://localhost:8080";

// The participant code travels with the player so The Silent Witness can add its
// score to this case's on the combined leaderboard.
function playNextCase(code) {
  const url = new URL(SILENT_WITNESS_URL);
  if (code) url.searchParams.set("code", code);
  window.location.href = url.toString();
}

export default function App() {
  const [session, setSession] = useState(null);
  const [viewLeaderboard, setViewLeaderboard] = useState(false);
  const [promoCode, setPromoCode] = useState(null);
  // Held here rather than in Confession so a trip to the leaderboard and back
  // shows the same result instead of re-submitting it.
  const [caseResult, setCaseResult] = useState(null);
  // NEXT CASE shows the Silent Witness title card before leaving this app.
  const [showNextCaseIntro, setShowNextCaseIntro] = useState(false);
  const goToNextCase = () => setShowNextCaseIntro(true);

  const handleStart = (newSession) => {
    setSession(newSession);
    setCaseResult(null);
    if (newSession && (newSession.code || newSession.session_id)) {
      setPromoCode(newSession.code || newSession.session_id);
    }
  };

  const caseSolved = session?.status === "CONFESSION";

  if (showNextCaseIntro) {
    return <NextCaseIntro onPlay={() => playNextCase(promoCode)} />;
  }

  if (viewLeaderboard) {
    // Back returns to the result screen when a game has finished, so a solved
    // case keeps its NEXT CASE button.
    return (
      <Leaderboard
        promoCode={promoCode}
        onBack={() => setViewLeaderboard(false)}
        onNextCase={caseSolved ? goToNextCase : undefined}
      />
    );
  }

  if (!session) {
    return <Start onStarted={handleStart} onViewLeaderboard={() => setViewLeaderboard(true)} />;
  }

  const isConfession = session.status === "CONFESSION";
  const isUnresolved =
    session.status === "ENDED" ||
    session.status === "OUT_OF_PROMPTS" ||
    session.status === "TIME_EXPIRED";

  let music = {
    src: "/assets/audio/interrogation-loop.mp3",
    loop: true,
    label: "interrogation soundtrack",
  };

  if (isConfession) {
    music = {
      src: "/assets/audio/case-solved.mp3",
      loop: false,
      label: "case solved theme",
    };
  } else if (isUnresolved) {
    music = {
      src: "/assets/audio/case-unsolved.mp3",
      loop: false,
      label: "case unresolved theme",
    };
  }

  if (isConfession || isUnresolved) {
    return (
      <>
        <BackgroundMusic {...music} />
        <Confession
          session={session}
          result={caseResult}
          onResult={setCaseResult}
          onRestart={() => setSession(null)}
          onNextCase={goToNextCase}
          onViewLeaderboard={() => setViewLeaderboard(true)}
        />
      </>
    );
  }

  return (
    <>
      <BackgroundMusic {...music} />
      <Interrogation session={session} onStatusChange={setSession} />
    </>
  );
}
