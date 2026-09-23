export async function startGame(participantCode) {
  // Step 1: Login/register the promo code and reset game state
  try {
    const resetRes = await fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: participantCode }),
    });
    if (!resetRes.ok) {
      throw new Error(`Server returned status ${resetRes.status}`);
    }
    const data = await resetRes.json();
    const state = data.state || {};
    return {
      session_id: data.code || participantCode,
      code: data.code || participantCode,
      student_id: data.student_id,
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
    throw err;
  }
}

export async function askQuestion(sessionId, question, { isEvidencePresentation = false } = {}) {
  const res = await fetch("/api/interrogate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: sessionId,
      question,
      is_evidence_presentation: isEvidencePresentation,
    }),
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
  const res = await fetch(`/api/state?code=${encodeURIComponent(sessionId)}`);
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

export async function submitResult(code, secondsRemaining = 0) {
  const res = await fetch("/api/result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      seconds_remaining: secondsRemaining,
    }),
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

export async function getMyRank(code) {
  const res = await fetch(`/api/leaderboard/my-rank?code=${encodeURIComponent(code)}`);
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }
  return res.json();
}
