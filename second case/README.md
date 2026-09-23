# The Silent Witness backend

This folder is intentionally backend-only. Start it from the repository root:

```powershell
py -3.12 "second case/server.py"
```

It listens on `http://127.0.0.1:8010`. The later UI should use the suspect list to render its selectable characters, then send questions to the selected suspect.

## API surface

- `GET /api/health` — service health
- `GET /api/case` — victim file, evidence list, shared milestones, and solve state
- `GET /api/suspects` — cards for the selection screen
- `GET /api/suspects/{suspect_id}` — public profile and live state
- `POST /api/suspects/{suspect_id}/interrogate` — question the selected character
- `POST /api/suspects/{suspect_id}/present-evidence` — show an evidence item without spending a question
- `POST /api/case/accuse` — submit a supported final accusation
- `POST /api/case/reset` — reset every suspect and shared case progress

Each AI turn reads the selected suspect's `character_sketches/*.md` file. Responses include the suspect state plus shared evidence and proof progress for the later UI.
