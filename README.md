# Prompt-X — AI Interrogation Game

**Prompt-X** is an immersive browser-based AI interrogation game where you play as a detective interrogating the prime suspect in a murder case, powered by Google Gemini AI.

## 🎮 Overview

You interrogate **Adrian Vale**, Lead Data Analyst at Aegis Forensic Analytics, suspected of killing his colleague **Daniel Mercer** on 14 September 2026. Your goal: ask the right questions, expose contradictions, and push Adrian's stress to breaking point to extract a full confession.

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Vite + TanStack Router
- **3D Scene**: React Three Fiber (Three.js)
- **Backend**: FastAPI (Python) serving the interrogation AI engine
- **AI**: Google Gemini API (`gemini-3.5-flash-lite`) for dynamic suspect responses
- **Styling**: Tailwind CSS + custom retro terminal aesthetic

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/abeljeevan/Promptx.git
   cd Promptx
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install Python backend dependencies**
   ```bash
   pip install fastapi uvicorn google-genai python-dotenv pytest
   ```

4. **Set up your Gemini API key**
   
   Create a `.env` file in the project root:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

### Running the App

1. **Start the Python backend** (in one terminal):
   ```bash
   python server.py
   ```
   The API will run at `http://localhost:8000`

2. **Start the frontend** (in another terminal):
   ```bash
   npm run dev
   ```
   Open `http://localhost:8080` in your browser.

## 🌐 Deploying

The repository includes a `Dockerfile` and `render.yaml` for a single-service
deployment. The container builds the React app and FastAPI serves it and the
`/api` endpoints from the same origin.

1. Push this repository to GitHub and create a new Render Blueprint from it.
2. Set the `GEMINI_API_KEY` environment variable in Render (it is intentionally
   not stored in the repository).
3. Deploy. Render will use the included health check at `/api/health`.

The game remains playable without the key, using its rule-based fallback; set
the key for live Gemini responses.

## 🕹 How to Play

- You have **10 prompts** to interrogate Adrian Vale
- Ask questions related to the case — evidence, timeline, alibi, motive
- Irrelevant questions are flagged and ignored
- Each relevant question increases **stress** on the suspect
- Reach **85%+ stress** to unlock Adrian's confession
- Click **SHOW EVIDENCE** to view the full case file and suspect profile

## 📁 Project Structure

```
├── src/                  # React frontend source
│   ├── components/       # UI components (InterrogationApp, Scene)
│   ├── routes/           # TanStack Router routes
│   └── styles.css        # Global styles
├── py.py                 # AI interrogation engine (Gemini + rule-based)
├── server.py             # FastAPI backend server
├── vite.config.ts        # Vite config (proxies /api → Python backend)
└── package.json
```

## 🔑 Key Evidence to Investigate

| Evidence | Details |
|----------|---------|
| Access Card #0890 | Used at sub-basement at 21:39 (Adrian claims he left at 21:15) |
| CCTV — Corridor B | Reflection of Adrian's coat walking toward archive at 21:37 |
| Phone Records | 14-second call from Adrian's phone to Daniel at 21:32 |
| PROJECT_ECHO | Remote wipe attempt from Adrian's terminal at 21:28 |
| Blue Nitrile Glove | Fragment found inside brass paperweight (the murder weapon) |

## 📜 License

MIT — feel free to use and modify.
