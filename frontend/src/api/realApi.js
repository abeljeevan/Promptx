export async function startGame(participantCode) {
  try {
    const res = await fetch("/api/reset", { method: "POST" });
    const data = await res.json();
    const state = data.state || {};
    return {
      session_id: participantCode || "PX-LIVE",
      stress: state.stress || 0,
      milestone: 0,
      question_count: state.turn || 0,
      turn_count: state.turn || 0,
      evidence_found: state.evidence_revealed || [],
      facts_count: state.facts_established ? state.facts_established.length : 0,
      status: state.status || "ACTIVE",
      prompts_left: state.prompts_left,
    };
  } catch (err) {
    console.error("startGame API error:", err);
    return {
      session_id: participantCode || "PX-LIVE",
      stress: 0,
      milestone: 0,
      question_count: 0,
      turn_count: 0,
      evidence_found: [],
      facts_count: 0,
      status: "ACTIVE",
      prompts_left: undefined,
    };
  }
}

export async function askQuestion(sessionId, question) {
  const res = await fetch("/api/interrogate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }

  const data = await res.json();
  const completedMilestones = data.milestones
    ? Object.values(data.milestones).filter(Boolean).length
    : 0;

  return {
    response: data.response || "No response received.",
    stress: data.stress !== undefined ? data.stress : 0,
    milestone: completedMilestones,
    status: data.status || "ACTIVE",
    evidence_found: data.evidence_revealed || [],
    turn_count: data.turn || 0,
    facts_count: data.facts_established ? data.facts_established.length : completedMilestones,
    // The server owns the prompt budget; the HUD must not keep its own count.
    prompts_left: data.prompts_left,
  };
}

export async function getState(sessionId) {
  const res = await fetch("/api/state");
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }

  const data = await res.json();
  const completedMilestones = data.milestones
    ? Object.values(data.milestones).filter(Boolean).length
    : 0;

  return {
    session_id: data.session_id || sessionId,
    stress: data.stress || 0,
    milestone: completedMilestones,
    question_count: data.turn || 0,
    turn_count: data.turn || 0,
    evidence_found: data.evidence_revealed || [],
    facts_count: data.facts_established ? data.facts_established.length : completedMilestones,
    status: data.status || "ACTIVE",
    prompts_left: data.prompts_left,
  };
}

export async function submitScore(scoreData) {
  const res = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scoreData),
  });
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }
  return res.json();
}

export async function getLeaderboard() {
  const res = await fetch("/api/leaderboard");
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }
  return res.json();
}

