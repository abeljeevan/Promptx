# Prompt X — Interrogation MVP Design

**Date:** 2026-09-18
**Source spec:** `PROMPT_X_DEVELOPMENT_GUIDE.md`

## Decisions

- **Visuals:** 2D layered compositing (flat PNG plates + CSS HUD/effects), per `ASSET_MANIFEST.md`. The 3D react-three-fiber prototype in `interrogation-prompt-x-source.zip` is not used — its scene is discarded, its game-state logic is discarded, but its asset filenames/props inspired nothing binding.
- **AI provider:** Gemini, via a small `ai_service.py` abstraction so another model can be substituted later. Key supplied via `.env` (`GEMINI_API_KEY`), gitignored.
- **Frontend base:** Fresh Vite + React app (not the Lovable/TanStack Start scaffold). Plain CSS using the tokens in `assets/DESIGN_TOKENS.css`.
- **Case content:** The example case from guide section 9 (Adrian Vale murders Daniel Mercer in the Archive Room) is the real content, encoded in `case_data.py`.
- **Persistence:** In-memory session dict only. No database. Sessions lost on server restart — acceptable for a single-day event.
- **Scope:** One vertical slice covering start → question loop → stress/milestones → confession → winner determination. Visual polish (CRT effects, admin panel, sound) is a later pass, not blocking this spec.
- **Build order:** UI-first. Build and style all frontend screens (Start, Interrogation, Confession) against a local mock API with realistic fake data, then build the backend, then swap the mock for real HTTP calls. This lets visual/UX iteration happen without waiting on backend or AI integration.
- **Evidence documents:** The 5 remaining evidence docs (phone record, fingerprint report, witness statement, evidence folder, timeline) are built as React components styled with `assets/DESIGN_TOKENS.css`, populated from `case_data.py` content — not generated raster images — per `ASSET_MANIFEST.md`'s explicit recommendation to keep text legible and data editable. No image-generation tooling (Adobe or otherwise) is needed for this MVP since the manifest's raster assets (room plate, suspect portrait, 3 evidence photos) are already delivered.

## Architecture

```
React (Vite) frontend  ──HTTP──▶  FastAPI backend
                                     ├── game_engine.py  (stress/milestones/confession — authoritative)
                                     ├── ai_service.py   (Gemini call → Adrian's dialogue + analysis)
                                     ├── case_data.py    (hidden case: truth, timeline, evidence, milestones)
                                     └── sessions: dict[str, SessionState]  (in-memory)
```

The frontend never computes game state; it only renders what the backend returns. The LLM never decides wins — it returns structured analysis (topic, evidence referenced, possible contradiction) that `game_engine.py` cross-checks against `case_data.py` rules before touching stress/milestones/confession.

## Backend

### `models.py`
Pydantic schemas for all request/response bodies: `StartResponse`, `QuestionRequest`, `QuestionResponse`, `StateResponse`, `AccuseRequest`, `AccuseResponse`, `LeaderboardEntry`.

### `case_data.py`
Hidden case content, never sent to the frontend directly:
- `TRUTH` — murderer, victim, location, time, weapon, motive, escape route (from guide section 9).
- `COVER_STORY` — Adrian's claimed timeline/story.
- `EVIDENCE` — 5 items, each with an id, display label (safe to show once discovered), and detection keywords/topics used to decide when the player has "found" it.
- `MILESTONES` — 5 entries (timeline, location, victim contact, motive, final contradiction), each with a condition function/keyword set describing what the player must reference to trigger it.
- `CONFESSION_THRESHOLD` — stress value required in addition to all milestones being complete.

### `game_engine.py`
Pure, testable functions operating on a `SessionState` dataclass (`session_id`, `stress`, `milestone`, `question_count`, `evidence_found: set`, `contradictions_exposed: set`, `asked_topics: set`, `status`, timestamps).

- `create_session(participant_code) -> SessionState`
- `evaluate_question(session, question_text, ai_analysis) -> SessionState` — the core referee:
  1. Reject if session not `ACTIVE`, question empty, or over length cap.
  2. Rate-limit: reject if called again within a minimum interval (anti-spam).
  3. Deduplicate: hash/normalize the question topic; if the same topic was already asked and answered, apply **+0** stress regardless of AI's analysis (guide section 11 anti-spam rule).
  4. Otherwise compute stress delta from a fixed table (generic +0, relevant +2, targets known clue +5, exposes inconsistency +10, uses evidence against claim +15, connects multiple clues +20, major contradiction +25), driven by matching the question + `ai_analysis.evidence_referenced` against `case_data.py` conditions — **not** by trusting any numeric field the LLM proposes.
  5. Check each incomplete milestone's condition against the accumulated evidence/contradictions; advance `milestone` when met.
  6. If `stress >= CONFESSION_THRESHOLD` and all 5 milestones complete: set `status = CONFESSION`, record `completion_timestamp = server time`.
  7. Increment `question_count`; enforce the optional question limit (guide section 22) by rejecting further questions once hit, without ending the session abruptly.
- `get_state(session) -> StateResponse` — safe, frontend-facing view (never includes `case_data` internals beyond discovered evidence labels).
- `register_completion(session) -> rank` — atomically appends to a module-level completion list to assign 1st/2nd place by server-side order.

### `ai_service.py`
- `ask_adrian(session: SessionState, question: str) -> AdrianReply` (`response`, `claim`, `tone`, `evidence_referenced`, `potential_contradiction`).
- Builds a compact prompt: character summary (guide section 6–7) + compact state block (guide section 28 format: stress, milestone, known evidence, exposed contradictions, Adrian's current emotional state, last response) + the new question. Does **not** send full transcript history.
- Requests structured JSON output from Gemini (guide section 14); parses defensively — malformed/missing fields fall back to a safe generic in-character deflection rather than crashing.
- One retry on timeout; on repeated failure, returns a friendly non-AI error string (guide section 32) — the caller treats this as "no state change, please retry," not as a game event.
- If the engine has just unlocked `CONFESSION_UNLOCKED`, the caller bypasses this function and returns a scripted confession line instead — confession text is never LLM-improvised.
- Prompt explicitly instructs the model to resist meta-instructions/prompt injection and never acknowledge being an AI (guide section 29), but this is a quality-of-response measure — the actual injection defense is that `game_engine.py` never trusts LLM-asserted win/stress/milestone fields.

### `main.py`
FastAPI app, CORS restricted to the frontend origin, wiring:
- `POST /game/start` — body: `{participant_code}`; creates session, returns `StartResponse`.
- `POST /game/question` — body: `{session_id, question}`; calls `ai_service.ask_adrian`, then `game_engine.evaluate_question`, returns `QuestionResponse` (Adrian's line + current stress/milestone/status, no hidden case data).
- `GET /game/state?session_id=...` — returns `StateResponse`.
- `POST /game/accuse` — body: `{session_id}`; checks current status/eligibility, no separate win path beyond what `evaluate_question` already computed (kept simple; mainly a UX affordance to let the player explicitly end their session).
- `GET /admin/leaderboard` — returns completions in server-assigned order. No auth for MVP (organizer-only network access assumed); flagged as a known limitation, not hardened further per "do not over-engineer."

Basic input validation (non-empty, length cap e.g. 500 chars) and per-session minimum question interval enforced server-side in `main.py`/`game_engine.py`, never trusting client timing.

## Frontend

Fresh Vite + React app, plain CSS (no Tailwind dependency required, tokens copied from `assets/DESIGN_TOKENS.css`).

- `pages/Start.jsx` — participant code entry, calls `/game/start`, stores `session_id` (in memory/sessionStorage).
- `pages/Interrogation.jsx` — composes:
  - `components/AdrianPanel.jsx` — layered portrait (`assets/character/suspect-portrait-source.png`) over `assets/environment/interrogation-room-plate.png`, CSS vignette/scanline/grain per manifest.
  - `components/StressGauge.jsx` — bar driven purely by `state.stress` from the backend.
  - `components/ChatLog.jsx` — question/response transcript.
  - `components/EvidencePanel.jsx` — shows only `evidence_found` from server state; undiscovered slots rendered blank/locked.
  - `components/Timer.jsx` — displays a server-provided remaining time, re-synced on each `/game/state` poll; not the source of truth for timeout.
- `pages/Confession.jsx` — shown when `status === "CONFESSION"`; displays a case summary (safe subset of `case_data`, exposed  via the backend, not reconstructed client-side).
- `pages/Admin.jsx` — thin table over `/admin/leaderboard`.

Frontend never sends `stress`, `milestone`, or `status` values to the backend — only `session_id` and `question` text (guide section 34).

## Error Handling

- AI request failure/timeout → backend returns a friendly in-fiction-adjacent error message; frontend shows it in the transcript without altering game state.
- Unknown/expired `session_id` → 404, frontend redirects to Start.
- Never expose stack traces, API keys, or raw provider errors to the client.

## Testing

Manual pass through guide section 38's test list before event day (normal question, evidence-based question, repeated question x3, prompt injection, long input, empty input, simulated AI failure, ~20 concurrent sessions). No automated test suite for this MVP — scope/time tradeoff, consistent with "do not over-engineer."

## Out of scope for this spec (later passes)

- CRT/stress-based escalating visual effects beyond a basic vignette/scanline.
- Sound effects.
- Supabase/Postgres persistence.
- Authenticated admin panel.
- Deployment configuration (Vercel/Render) — addressed once the app runs locally end-to-end.
