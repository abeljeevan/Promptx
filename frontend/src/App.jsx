import { useState } from "react";
import { Start } from "./pages/Start";
import { Interrogation } from "./pages/Interrogation";
import { Confession } from "./pages/Confession";
import { BackgroundMusic } from "./components/BackgroundMusic";
import "./styles/tokens.css";
import "./styles/app.css";

export default function App() {
  const [session, setSession] = useState(null);

  if (!session) {
    return <Start onStarted={setSession} />;
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
        <Confession session={session} onRestart={() => setSession(null)} />
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
