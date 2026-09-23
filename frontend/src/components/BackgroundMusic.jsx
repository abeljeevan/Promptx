import { useEffect, useRef, useState } from "react";

export function BackgroundMusic({ src, loop, label }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = 0.22;
    audioRef.current = audio;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setIsAvailable(false);
      setIsPlaying(false);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);
    setIsAvailable(true);

    // Browsers may defer this until the first user interaction. The control
    // remains available so the player can explicitly start the soundtrack.
    audio.play().catch(() => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
    };
  }, [src, loop]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || !isAvailable) return;
    if (audio.paused) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  };

  return (
    <button
      type="button"
      className="music-toggle"
      onClick={togglePlayback}
      disabled={!isAvailable}
      aria-label={`${isPlaying ? "Mute" : "Play"} ${label}`}
    >
      {isAvailable ? `MUSIC ${isPlaying ? "ON" : "OFF"}` : "MUSIC UNAVAILABLE"}
    </button>
  );
}
