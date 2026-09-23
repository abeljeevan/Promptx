const EVIDENCE_IDS = ["access_card", "cctv", "phone_records", "victim_files", "physical_clue"];

const MOCK_REPLIES = [
  "You're assuming that being present makes me responsible.",
  "I don't remember being in that room at the time you're describing.",
  "My card was not necessarily in my possession the entire evening.",
  "I've already told you what I know. What exactly are you trying to establish?",
  "That's not an interrogation question. If you believe you have evidence, present it.",
];

const state = {
  session: null,
  replyIndex: 0,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startGame(participantCode) {
  await delay(300);
  state.session = {
    session_id: `PX-mock-${participantCode}`,
    stress: 0,
    milestone: 0,
    question_count: 0,
    evidence_found: [],
    status: "ACTIVE",
  };
  state.replyIndex = 0;
  return { ...state.session };
}

export async function askQuestion(sessionId, question) {
  await delay(600);
  if (!state.session || state.session.session_id !== sessionId) {
    throw new Error("Session not found");
  }
  if (!question.trim()) {
    throw new Error("Question must not be empty");
  }

  const session = state.session;
  session.question_count += 1;

  // Mock progression: each question advances stress and unlocks the next
  // evidence item, so the UI can be exercised end-to-end without a backend.
  session.stress = Math.min(100, session.stress + 18);
  const nextEvidence = EVIDENCE_IDS[session.evidence_found.length];
  if (nextEvidence) {
    session.evidence_found = [...session.evidence_found, nextEvidence];
    session.milestone = Math.min(5, session.milestone + 1);
  }
  if (session.milestone >= 5 && session.stress >= 80) {
    session.status = "CONFESSION";
  }

  const response =
    session.status === "CONFESSION"
      ? "...Fine. I was there. Daniel found the records and threatened to report me. It got out of hand. I did it."
      : MOCK_REPLIES[state.replyIndex++ % MOCK_REPLIES.length];

  return {
    response,
    stress: session.stress,
    milestone: session.milestone,
    status: session.status,
    evidence_found: [...session.evidence_found],
  };
}

export async function getState(sessionId) {
  await delay(150);
  if (!state.session || state.session.session_id !== sessionId) {
    throw new Error("Session not found");
  }
  return { ...state.session, evidence_found: [...state.session.evidence_found] };
}
