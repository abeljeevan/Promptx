import { useRef } from "react";

// Evidence is opened by clicking the case folder on the desk, not from here.
const ACTIONS = [
  { id: "ask", label: "ASK QUESTION" },
  { id: "accuse", label: "ACCUSE" },
  { id: "end", label: "END" },
];

export function ActionBar({ active, onSelect, disabled }) {
  const buttonsRef = useRef([]);

  const handleKeyDown = (event, index) => {
    const lastIndex = ACTIONS.length - 1;
    let nextIndex = null;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = index === 0 ? lastIndex : index - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    onSelect(ACTIONS[nextIndex].id);
    buttonsRef.current[nextIndex]?.focus();
  };

  return (
    <nav className="action-bar" aria-label="Case actions">
      {ACTIONS.map((action, index) => {
        const isActive = active === action.id;
        return (
          <button
            key={action.id}
            type="button"
            ref={(node) => {
              buttonsRef.current[index] = node;
            }}
            className={`action-button${isActive ? " action-active" : ""}`}
            aria-current={isActive ? "true" : undefined}
            disabled={disabled}
            onClick={() => onSelect(action.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span className="action-caret" aria-hidden="true">
              {isActive ? "▶" : ""}
            </span>
            {action.label}
          </button>
        );
      })}
    </nav>
  );
}
