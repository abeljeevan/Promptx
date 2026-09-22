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
      evidence_found: state.evidence_revealed || [],
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
      evidence_found: [],
      status: "ACTIVE",
      prompts_left: undefined,
    };
  }
}

export async function askQuestion(sessionId, question, { isEvidencePresentation = false } = {}) {
  const res = await fetch("/api/interrogate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, is_evidence_presentation: isEvidencePresentation }),
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
    evidence_found: data.evidence_revealed || [],
    status: data.status || "ACTIVE",
    prompts_left: data.prompts_left,
  };
}
