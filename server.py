import os
import sys
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Import py module functions and GameState
try:
    from py import GameState, process_turn, MAX_PROMPTS, out_of_prompts_response
except ImportError:
    # If imported from another path
    sys.path.append(os.path.dirname(__file__))
    from py import GameState, process_turn, MAX_PROMPTS, out_of_prompts_response

app = FastAPI(title="Prompt-X Interrogation API")

PROJECT_ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory game state
game_state = GameState("LIVE-SESSION")

class QuestionRequest(BaseModel):
    question: str
    is_evidence_presentation: bool = False

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Prompt-X Interrogation API running"}

@app.get("/api/state")
def get_state():
    return {
        "session_id": game_state.session_id,
        "turn": game_state.turn,
        "stress": game_state.stress,
        "stress_state": game_state.stress_state,
        "status": game_state.status,
        "evidence_revealed": list(game_state.evidence_revealed),
        "facts_established": list(game_state.facts_established),
        "milestones": game_state.milestones,
        "prompts_left": max(0, MAX_PROMPTS - game_state.turn)
    }

@app.post("/api/interrogate")
async def interrogate(req: QuestionRequest):
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    
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
            "confession": True
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
            "confession": False
        }

    turn_result = await process_turn(
        req.question.strip(),
        game_state,
        consumes_prompt=not req.is_evidence_presentation,
    )
    res = turn_result["adrian_res"]
    
    if not res["success"]:
        response_text = f"Error generating response: {res.get('error', 'Unknown error')}"
    else:
        response_text = res["answer"]

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
        "confession": game_state.status == "CONFESSION"
    }

@app.post("/api/reset")
def reset_game():
    global game_state
    game_state = GameState("LIVE-SESSION")
    return {
        "message": "Game state reset successfully",
        "state": get_state()
    }


# In deployment the frontend is built into frontend/dist and served by this
# process.  The catch-all keeps client-side navigation working on page refresh.
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
