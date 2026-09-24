import os
import sys
import sqlite3
import datetime
import time as _time
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Import py module functions and GameState
try:
    from py import (
        GameState, process_turn, MAX_PROMPTS, out_of_prompts_response, calculate_solution_score,
        generate_controlled_confession, get_stress_state,
    )
except ImportError:
    sys.path.append(os.path.dirname(__file__))
    from py import (
        GameState, process_turn, MAX_PROMPTS, out_of_prompts_response, calculate_solution_score,
        generate_controlled_confession, get_stress_state,
    )

# Dev/demo shortcut: typing this as a question instantly resolves the case
# instead of going through Gemini, so the confession + leaderboard flow can
# be exercised without a real interrogation.
CHEAT_CODE = "honeyabel"
ALL_EVIDENCE_IDS = ["access_card", "cctv", "phone_records", "daniel_files", "physical_clue"]

app = FastAPI(title="Prompt-X Interrogation API")

PROJECT_ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
DB_PATH = PROJECT_ROOT / "leaderboard.db"

ROUND_SECONDS = 10 * 60  # 10-minute interrogation limit


# ──────────────────────────────────────────────────────────────
# DATABASE INIT
# Two tables:
#   students — one row per unique participant code
#   results  — one row per completed game, linked to students
# ──────────────────────────────────────────────────────────────
def get_db():
    """Return a new SQLite connection with row-factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS students (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            code       TEXT    NOT NULL COLLATE NOCASE,
            joined_at  TEXT    NOT NULL,
            UNIQUE(code)
        );

        CREATE TABLE IF NOT EXISTS results (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id           INTEGER NOT NULL REFERENCES students(id),
            case_id              TEXT    NOT NULL DEFAULT 'silent_witness',
            outcome              TEXT    NOT NULL,
            solved               INTEGER NOT NULL,
            score                INTEGER NOT NULL,
            questions_used       INTEGER NOT NULL,
            milestones_completed INTEGER NOT NULL,
            final_stress         INTEGER NOT NULL,
            time_taken           INTEGER NOT NULL,
            completed_at         TEXT    NOT NULL,
            UNIQUE(student_id, case_id, completed_at)
        );
    """)
    # Drop the old scores table if it exists (was empty/unused)
    try:
        conn.execute("DROP TABLE IF EXISTS scores")
    except Exception:
        pass
    conn.commit()
    conn.close()


init_db()

# ──────────────────────────────────────────────────────────────
# MIDDLEWARE
# ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────
# PER-STUDENT GAME SESSIONS  (multi-player support)
# ──────────────────────────────────────────────────────────────
# Each promo code gets its own GameState and metadata.
# Keys are promo codes (uppercased for consistency).
active_sessions: dict[str, dict] = {}
# Structure per entry:
# {
#     "game_state": GameState,
#     "student_id": int,
#     "code": str,
#     "started_at": float,          # time.time() for server-side timing
#     "result_submitted": bool,     # prevent duplicate submissions
# }


def _get_session(code: str) -> dict:
    """Look up an active session by promo code. Raises 404 if not found."""
    key = code.strip().upper()
    session = active_sessions.get(key)
    if not session:
        raise HTTPException(status_code=404, detail="No active session for this code. Start a game first.")
    return session


def _state_dict(gs: GameState) -> dict:
    """Serialize a GameState into the API response shape."""
    return {
        "session_id": gs.session_id,
        "turn": gs.turn,
        "stress": gs.stress,
        "stress_state": gs.stress_state,
        "status": gs.status,
        "evidence_revealed": list(gs.evidence_revealed),
        "facts_established": list(gs.facts_established),
        "milestones": gs.milestones,
        "prompts_left": max(0, MAX_PROMPTS - gs.turn),
    }


# ──────────────────────────────────────────────────────────────
# PYDANTIC MODELS
# ──────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    code: str                           # participant code, e.g. "PX-001"

class ResetRequest(BaseModel):
    code: str                           # promo code — used to login + create session

class QuestionRequest(BaseModel):
    code: str                           # identifies which session
    question: str
    is_evidence_presentation: bool = False

class ResultRequest(BaseModel):
    code: str                           # promo code
    seconds_remaining: int = 0          # client-side timer value (fallback only)


# ──────────────────────────────────────────────────────────────
# HEALTH
# ──────────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Prompt-X Interrogation API running"}


# ──────────────────────────────────────────────────────────────
# STUDENT LOGIN  —  register or find by participant code
# ──────────────────────────────────────────────────────────────
@app.post("/api/login")
def login(req: LoginRequest):
    code = req.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="Participant code cannot be empty.")

    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, code FROM students WHERE code = ?", (code,)
        ).fetchone()

        if row:
            return {"student_id": row["id"], "code": row["code"], "is_new": False}

        # New student
        now = datetime.datetime.now().isoformat()
        cur = conn.execute(
            "INSERT INTO students (code, joined_at) VALUES (?, ?)", (code, now)
        )
        conn.commit()
        return {"student_id": cur.lastrowid, "code": code, "is_new": True}
    finally:
        conn.close()


def _login_or_get(code: str) -> tuple[int, str]:
    """Register/find student and return (student_id, code). Internal helper."""
    code = code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="Participant code cannot be empty.")

    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, code FROM students WHERE code = ?", (code,)
        ).fetchone()

        if row:
            return row["id"], row["code"]

        now = datetime.datetime.now().isoformat()
        cur = conn.execute(
            "INSERT INTO students (code, joined_at) VALUES (?, ?)", (code, now)
        )
        conn.commit()
        return cur.lastrowid, code
    finally:
        conn.close()


# ──────────────────────────────────────────────────────────────
# GAME STATE  —  per-student sessions
# ──────────────────────────────────────────────────────────────
@app.get("/api/state")
def get_state(code: str = ""):
    """Return game state for a specific promo code."""
    if not code:
        raise HTTPException(status_code=400, detail="Promo code required.")
    session = _get_session(code)
    return _state_dict(session["game_state"])


@app.post("/api/reset")
def reset_game(req: ResetRequest):
    """Login (if needed) and create a fresh game session for this promo code."""
    student_id, code = _login_or_get(req.code)
    key = code.strip().upper()

    gs = GameState(code)
    active_sessions[key] = {
        "game_state": gs,
        "student_id": student_id,
        "code": code,
        "started_at": _time.time(),
        "result_submitted": False,
    }

    return {
        "message": "Game state reset successfully",
        "student_id": student_id,
        "code": code,
        "state": _state_dict(gs),
    }


# ──────────────────────────────────────────────────────────────
# INTERROGATION  —  per-student
# ──────────────────────────────────────────────────────────────
@app.post("/api/interrogate")
async def interrogate(req: QuestionRequest):
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    session = _get_session(req.code)
    game_state = session["game_state"]

    if req.question.strip().lower() == CHEAT_CODE and game_state.status not in ("CONFESSION", "OUT_OF_PROMPTS"):
        for key in game_state.milestones:
            game_state.milestones[key] = True
        game_state.evidence_revealed.update(ALL_EVIDENCE_IDS)
        game_state.stress = 100
        game_state.stress_state = get_stress_state(100)
        game_state.status = "CONFESSION"
        game_state.confession_unlocked = True
        return {
            "response": generate_controlled_confession(game_state),
            "stress": game_state.stress,
            "stress_state": game_state.stress_state,
            "status": "CONFESSION",
            "prompts_left": max(0, MAX_PROMPTS - game_state.turn),
            "evidence_revealed": list(game_state.evidence_revealed),
            "milestones": game_state.milestones,
            "turn": game_state.turn,
            "confession": True,
        }

    if game_state.status == "CONFESSION":
        return {
            "response": "Adrian has already confessed! Case solved.",
            "stress": game_state.stress,
            "stress_state": game_state.stress_state,
            "status": "CONFESSION",
            "prompts_left": max(0, MAX_PROMPTS - game_state.turn),
            "evidence_revealed": list(game_state.evidence_revealed),
            "milestones": game_state.milestones,
            "turn": game_state.turn,
            "confession": True,
        }

    if game_state.status == "OUT_OF_PROMPTS":
        return {
            "response": out_of_prompts_response(game_state),
            "stress": game_state.stress,
            "stress_state": game_state.stress_state,
            "status": "OUT_OF_PROMPTS",
            "prompts_left": 0,
            "evidence_revealed": list(game_state.evidence_revealed),
            "milestones": game_state.milestones,
            "turn": game_state.turn,
            "confession": False,
        }

    turn_result = await process_turn(
        req.question.strip(),
        game_state,
        consumes_prompt=not req.is_evidence_presentation,
    )
    res = turn_result["adrian_res"]
    response_text = res["answer"] if res["success"] else f"Error: {res.get('error', 'Unknown error')}"

    return {
        "response": response_text,
        "stress": game_state.stress,
        "stress_state": game_state.stress_state,
        "status": game_state.status,
        "prompts_left": max(0, MAX_PROMPTS - game_state.turn),
        "evidence_revealed": list(game_state.evidence_revealed),
        "milestones": game_state.milestones,
        "turn": game_state.turn,
        "delta": turn_result.get("delta", 0),
        "confession": game_state.status == "CONFESSION",
    }


# ──────────────────────────────────────────────────────────────
# RESULT SUBMISSION  —  backend-validated, auto-called at game end
# The frontend sends ONLY the promo code and seconds_remaining.
# All scoring data is read from the authoritative server-side GameState.
# ──────────────────────────────────────────────────────────────
@app.post("/api/result")
def submit_result(req: ResultRequest):
    session = _get_session(req.code)
    game_state = session["game_state"]

    # Must be a finished game
    if game_state.status == "ACTIVE":
        raise HTTPException(status_code=400, detail="Game is still active. Cannot submit result yet.")

    # Prevent duplicate submissions for the same session
    if session["result_submitted"]:
        return {"message": "Result already submitted.", "duplicate": True}

    # Time taken: prefer server-side timing, fall back to client seconds_remaining
    elapsed_server = _time.time() - session["started_at"]
    time_taken = min(int(elapsed_server), ROUND_SECONDS)
    # If game ended by time expiry, time_taken is the full round
    if game_state.status == "TIME_EXPIRED":
        time_taken = ROUND_SECONDS

    # Calculate score from authoritative server-side state
    score = calculate_solution_score(game_state, time_taken)
    solved = 1 if game_state.status == "CONFESSION" else 0
    questions_used = game_state.turn
    milestones_completed = sum(1 for v in game_state.milestones.values() if v)
    final_stress = game_state.stress

    outcome = game_state.status  # CONFESSION | OUT_OF_PROMPTS | TIME_EXPIRED | ENDED
    now = datetime.datetime.now().isoformat()

    conn = get_db()
    try:
        conn.execute(
            """
            INSERT INTO results
                (student_id, case_id, outcome, solved, score,
                 questions_used, milestones_completed, final_stress,
                 time_taken, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session["student_id"],
                "silent_witness",
                outcome,
                solved,
                score,
                questions_used,
                milestones_completed,
                final_stress,
                time_taken,
                now,
            ),
        )
        conn.commit()

        # Mark session as submitted to prevent duplicates
        session["result_submitted"] = True

        return {
            "message": "Result recorded successfully.",
            "duplicate": False,
            "score": score,
            "solved": bool(solved),
            "questions_used": questions_used,
            "milestones_completed": milestones_completed,
            "final_stress": final_stress,
            "time_taken": time_taken,
        }
    except sqlite3.IntegrityError:
        # UNIQUE constraint violation — duplicate submission
        session["result_submitted"] = True
        return {"message": "Result already submitted.", "duplicate": True}
    finally:
        conn.close()


# ──────────────────────────────────────────────────────────────
# LEADERBOARD  —  generated from results table
# Ranked: highest score → lowest time → fewest questions
# ──────────────────────────────────────────────────────────────
@app.get("/api/leaderboard")
def get_leaderboard():
    conn = get_db()
    try:
        rows = conn.execute(
            """
            SELECT
                s.code               AS promo_code,
                r.score,
                r.solved,
                r.questions_used,
                r.milestones_completed,
                r.final_stress,
                r.time_taken,
                r.outcome,
                r.completed_at
            FROM results r
            JOIN students s ON s.id = r.student_id
            WHERE r.case_id = 'silent_witness'
            ORDER BY r.score DESC, r.time_taken ASC, r.questions_used ASC
            LIMIT 50
            """
        ).fetchall()
        return {"leaderboard": [dict(r) for r in rows]}
    finally:
        conn.close()


@app.get("/api/leaderboard/my-rank")
def get_my_rank(code: str = ""):
    """Return the rank and stats for a specific promo code.

    Uses the exact same ORDER BY as the global leaderboard so rank is
    consistent between the two views.
    """
    code = code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="Promo code required.")

    conn = get_db()
    try:
        # Use ROW_NUMBER with the same ordering as the global leaderboard
        row = conn.execute(
            """
            WITH ranked AS (
                SELECT
                    s.code               AS promo_code,
                    r.score,
                    r.solved,
                    r.questions_used,
                    r.milestones_completed,
                    r.final_stress,
                    r.time_taken,
                    r.outcome,
                    r.completed_at,
                    ROW_NUMBER() OVER (
                        ORDER BY r.score DESC, r.time_taken ASC, r.questions_used ASC
                    ) AS rank
                FROM results r
                JOIN students s ON s.id = r.student_id
                WHERE r.case_id = 'silent_witness'
            )
            SELECT * FROM ranked
            WHERE promo_code = ?
            ORDER BY rank ASC
            LIMIT 1
            """,
            (code,),
        ).fetchone()

        if not row:
            return {"found": False, "message": "No completed result for this promo code."}

        return {
            "found": True,
            "rank": row["rank"],
            "promo_code": row["promo_code"],
            "score": row["score"],
            "solved": row["solved"],
            "questions_used": row["questions_used"],
            "milestones_completed": row["milestones_completed"],
            "final_stress": row["final_stress"],
            "time_taken": row["time_taken"],
            "outcome": row["outcome"],
        }
    finally:
        conn.close()


# ──────────────────────────────────────────────────────────────
# STATIC FRONTEND (production build only)
# ──────────────────────────────────────────────────────────────
if FRONTEND_DIST.is_dir():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def serve_frontend(path: str):
        requested_file = FRONTEND_DIST / path
        if path and requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(FRONTEND_DIST / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
