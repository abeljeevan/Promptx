import { useEffect, useRef, useState, type MouseEvent } from "react";

type BackgroundMusicProps = {
  src: string;
  loop: boolean;
  label: string;
};

// Same behaviour as Adrian's case (frontend/src/components/BackgroundMusic.jsx):
// one track at a time, low volume, with an on/off toggle.
export function BackgroundMusic({ src, loop, label }: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = 0.22;
    audioRef.current = audio;
    // play() rejects asynchronously, possibly after this effect was cleaned
    // up; a stale track must never arm the first-interaction listener.
    let cancelled = false;

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

    // Arriving from Adrian's PLAY button is a fresh page load, so browsers
    // usually block autoplay. Start on the player's first click or key instead.
    const startOnInteraction = () => {
      removeInteraction();
      if (!cancelled && audio.paused) audio.play().catch(() => setIsPlaying(false));
    };
    const removeInteraction = () => {
      window.removeEventListener("pointerdown", startOnInteraction);
      window.removeEventListener("keydown", startOnInteraction);
    };
    audio.play().catch(() => {
      if (cancelled) return;
      setIsPlaying(false);
      window.addEventListener("pointerdown", startOnInteraction);
      window.addEventListener("keydown", startOnInteraction);
    });

    return () => {
      cancelled = true;
      removeInteraction();
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
    };
  }, [src, loop]);

  const togglePlayback = (event: MouseEvent) => {
    // Don't let the page-level "first interaction" listener also toggle it.
    event.nativeEvent.stopImmediatePropagation();
    const audio = audioRef.current;
    if (!audio || !isAvailable) return;
    if (audio.paused) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  };

  return (
    <button
      type="button"
      className="music-toggle"
      onPointerDown={(event) => event.nativeEvent.stopImmediatePropagation()}
      onClick={togglePlayback}
      disabled={!isAvailable}
      aria-label={`${isPlaying ? "Mute" : "Play"} ${label}`}
    >
      {isAvailable ? `MUSIC ${isPlaying ? "ON" : "OFF"}` : "MUSIC UNAVAILABLE"}
    </button>
  );
}
