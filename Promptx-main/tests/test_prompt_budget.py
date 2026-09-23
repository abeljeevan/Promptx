"""Regression suite for Task 2: server-side enforcement of the prompt budget.

Runs fully offline via the same conftest.py isolation as
tests/test_rules_engine.py (GEMINI_API_KEY absent, py.client is None, no
network calls).

Covers:
- MAX_PROMPTS is a real module-level constant in py.py.
- A turn beyond the budget sets state.status to the terminal "OUT_OF_PROMPTS"
  value instead of leaving the session ACTIVE forever.
- The in-character refusal line (out_of_prompts_response) does not resemble
  the old system-voice "You are typing an irrelevant question" scolding.
- Confession always wins: a confession triggered by the final permitted
  question produces CONFESSION, never OUT_OF_PROMPTS.
- A skilled line that reaches confession mid-budget (turn 8 of 15) still
  returns CONFESSION well before exhaustion would ever apply.
- server.py's /api/interrogate and /api/reset behave correctly around the
  budget boundary (via FastAPI's TestClient, no live server required).
"""
import asyncio
import os
import sys

import pytest

sys.path.insert(0, ".")
import conftest

rules = conftest.rules_engine

GameState = rules.GameState
process_turn = rules.process_turn
MAX_PROMPTS = rules.MAX_PROMPTS
out_of_prompts_response = rules.out_of_prompts_response
check_confession_eligibility = rules.check_confession_eligibility
BENCHMARK_QUESTIONS = rules.BENCHMARK_QUESTIONS


@pytest.fixture(autouse=True)
def no_gemini_client(monkeypatch):
    """Same belt-and-suspenders guarantee as test_rules_engine.py: never let
    this suite reach the network even if the environment has a real key.
    """
    monkeypatch.setattr(rules, "client", None)


def make_state(session_id="TEST-BUDGET"):
    return GameState(session_id)


# A relevant-but-non-evidentiary question. Used as padding to control exactly
# which turn confession lands on without changing which evidence is exposed.
NEUTRAL_RELEVANT_QUESTION = "Where were you last night?"

# One clearly off-topic question, reused to drive a session to exhaustion
# without ever building enough stress/milestones to confess.
OFF_TOPIC_QUESTION = "What's your favourite colour?"


# ============================================================
# MAX_PROMPTS is a real, shared constant
# ============================================================

def test_max_prompts_is_fifteen():
    assert MAX_PROMPTS == 15


# ============================================================
# Budget exhaustion sets a terminal status
# ============================================================

def test_session_stays_active_through_the_last_permitted_prompt():
    state = make_state()
    for _ in range(MAX_PROMPTS):
        asyncio.run(process_turn(OFF_TOPIC_QUESTION, state))
    assert state.turn == MAX_PROMPTS
    assert state.status == "OUT_OF_PROMPTS"


def test_status_is_still_active_one_short_of_the_budget():
    state = make_state()
    for _ in range(MAX_PROMPTS - 1):
        asyncio.run(process_turn(OFF_TOPIC_QUESTION, state))
    assert state.turn == MAX_PROMPTS - 1
    assert state.status == "ACTIVE"


def test_out_of_prompts_response_is_in_character_not_system_voice():
    state = make_state()
    line = out_of_prompts_response(state)
    assert line, "expected a non-empty in-character line"
    # The old system-voice scolding this task removes for good.
    banned_phrases = [
        "You are typing an irrelevant question",
        "Please follow the case studies",
    ]
    for phrase in banned_phrases:
        assert phrase not in line
    # Should read like Adrian talking, not an error/status message.
    assert "error" not in line.lower()
    assert "prompt" not in line.lower()


# ============================================================
# Confession must win over exhaustion
# ============================================================

# The benchmark line reaches CONFESSION well before all 15 of its own
# questions are asked (empirically turn 7 of 15 from a cold state). Padding
# it with neutral relevant questions first pushes the confession turn later
# without changing which evidence gets exposed, so the pad length controls
# exactly which turn confession lands on.
CONFESSION_PAD_FOR_FINAL_PROMPT = [NEUTRAL_RELEVANT_QUESTION] * 8


def test_confession_on_final_permitted_question_beats_exhaustion():
    """If the question that consumes the last prompt also triggers a
    confession, the outcome must be CONFESSION — never OUT_OF_PROMPTS.
    """
    questions = CONFESSION_PAD_FOR_FINAL_PROMPT + list(BENCHMARK_QUESTIONS)

    state = make_state()
    for q in questions:
        asyncio.run(process_turn(q, state))
        if state.status == "CONFESSION":
            break

    assert state.turn == MAX_PROMPTS, (
        f"expected confession to land exactly on the final permitted prompt, "
        f"landed on turn {state.turn} instead"
    )
    assert state.status == "CONFESSION"


def test_skilled_line_confesses_mid_budget_on_turn_eight():
    """A skilled line reaching confession well inside the budget (turn 8 of
    15) must return CONFESSION — this is not an exhaustion path at all, but
    guards the ordering regression where an exhaustion check placed before
    confession-eligibility could ever preempt it.
    """
    questions = [NEUTRAL_RELEVANT_QUESTION] + list(BENCHMARK_QUESTIONS)

    state = make_state()
    for i, q in enumerate(questions, 1):
        asyncio.run(process_turn(q, state))
        if state.status == "CONFESSION":
            break

    assert state.turn == 8, f"expected confession on turn 8, got turn {state.turn}"
    assert state.status == "CONFESSION"
    assert state.turn < MAX_PROMPTS


# ============================================================
# Server-level behaviour (FastAPI TestClient — no live server needed)
# ============================================================

@pytest.fixture
def client(monkeypatch):
    """Import server.py wrapped in a FastAPI TestClient, wired to the same
    already-loaded, offline `py.py` module conftest uses for the rules-engine
    suite. Avoids any dependency on a running uvicorn process (which, per
    project experience, can silently serve stale code after edits to py.py)
    and avoids re-importing py.py under the plain name "py" — a real PyPI
    package of that name is installed in this environment and would shadow
    it if `from py import ...` were allowed to resolve normally outside the
    repo root.
    """
    import importlib.util
    import sys as _sys

    fastapi_testclient = pytest.importorskip("fastapi.testclient")

    # Alias the already-loaded, isolated rules-engine module under the name
    # server.py imports ("py"), so `from py import ...` inside server.py
    # binds to our offline instance instead of triggering a fresh import
    # that could resolve to the installed `py` package or a live-keyed
    # py.py.
    had_py = "py" in _sys.modules
    old_py = _sys.modules.get("py")
    _sys.modules["py"] = rules
    try:
        spec = importlib.util.spec_from_file_location(
            "promptx_server_under_test",
            os.path.join(conftest.REPO_ROOT, "server.py"),
        )
        server_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(server_module)
    finally:
        if had_py:
            _sys.modules["py"] = old_py
        else:
            del _sys.modules["py"]

    monkeypatch.setattr(rules, "client", None)

    return fastapi_testclient.TestClient(server_module.app)


def _ask(client, question):
    return client.post("/api/interrogate", json={"question": question})


def test_server_sixteen_question_off_topic_session_refuses_the_16th(client):
    responses = []
    for _ in range(MAX_PROMPTS):
        responses.append(_ask(client, OFF_TOPIC_QUESTION))

    # Terminal status reached at question 15.
    last_permitted = responses[-1].json()
    assert last_permitted["status"] == "OUT_OF_PROMPTS"
    assert last_permitted["prompts_left"] == 0

    # Question 16 is refused: still 200, still OUT_OF_PROMPTS, in-character.
    sixteenth = _ask(client, OFF_TOPIC_QUESTION)
    assert sixteenth.status_code == 200
    body = sixteenth.json()
    assert body["status"] == "OUT_OF_PROMPTS"
    assert body["prompts_left"] == 0
    assert "You are typing an irrelevant question" not in body["response"]
    assert body["response"], "expected Adrian's in-character refusal line"


def test_server_skilled_line_confession_on_turn_eight(client):
    questions = [NEUTRAL_RELEVANT_QUESTION] + list(BENCHMARK_QUESTIONS)
    last = None
    for i, q in enumerate(questions, 1):
        last = _ask(client, q)
        if last.json()["status"] == "CONFESSION":
            break

    body = last.json()
    assert body["status"] == "CONFESSION"
    assert body["turn"] == 8
    assert body["confession"] is True


def test_server_confession_on_final_permitted_question_is_confession_not_exhaustion(client):
    questions = CONFESSION_PAD_FOR_FINAL_PROMPT + list(BENCHMARK_QUESTIONS)

    last = None
    for q in questions:
        last = _ask(client, q)
        if last.json()["status"] == "CONFESSION":
            break

    body = last.json()
    assert body["turn"] == MAX_PROMPTS
    assert body["status"] == "CONFESSION"
    assert body["status"] != "OUT_OF_PROMPTS"


def test_server_reset_clears_terminal_status(client):
    for _ in range(MAX_PROMPTS):
        _ask(client, OFF_TOPIC_QUESTION)

    exhausted_state = client.get("/api/state").json()
    assert exhausted_state["status"] == "OUT_OF_PROMPTS"

    reset_body = client.post("/api/reset").json()
    assert reset_body["state"]["status"] == "ACTIVE"
    assert reset_body["state"]["turn"] == 0
    assert reset_body["state"]["prompts_left"] == MAX_PROMPTS

    # Session is playable again post-reset.
    follow_up = _ask(client, NEUTRAL_RELEVANT_QUESTION)
    assert follow_up.status_code == 200
    assert follow_up.json()["status"] == "ACTIVE"
    assert follow_up.json()["turn"] == 1
