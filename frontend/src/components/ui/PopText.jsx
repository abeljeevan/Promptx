import { useEffect, useState } from "react";

export function PopText({ text, className = "", delay = 0, speed = 12 }) {
  const [displayedLength, setDisplayedLength] = useState(0);

  useEffect(() => {
    setDisplayedLength(0);
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayedLength((prev) => {
          if (prev >= text.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay, speed]);

  const visibleText = text ? text.slice(0, displayedLength) : "";

  return (
    <span className={`pop-text-container ${className}`}>
      {visibleText.split("").map((char, index) => (
        <span key={index} className="pop-letter">
          {char}
        </span>
      ))}
    </span>
  );
}
