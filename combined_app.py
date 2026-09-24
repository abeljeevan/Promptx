"""Single ASGI entrypoint that serves both cases from one process.

Both server.py (Case 1, Adrian Vale) and second case/server.py (Case 2, The
Silent Witness) read/write the same leaderboard.db by file path. Running them
as two separate deployed services would give each its own filesystem and
silently split the leaderboard, so both are mounted into one app here and
deployed as a single Render service instead.

Case 2 is mounted under /case2 *before* Case 1 is mounted at the root, since
Case 1 owns a catch-all route ("/{path:path}") that serves its built frontend
for anything unmatched — it must be tried last or it would swallow /case2/*.
"""
import importlib.util
import sys
from pathlib import Path

from fastapi import FastAPI

ROOT = Path(__file__).resolve().parent


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


case1 = _load_module("case1_server", ROOT / "server.py")
case2 = _load_module("case2_server", ROOT / "second case" / "server.py")

app = FastAPI(title="Prompt-X Combined API")
app.mount("/case2", case2.app)
app.mount("/", case1.app)
