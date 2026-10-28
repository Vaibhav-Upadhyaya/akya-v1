# Akya v1 (AgentUI)

An autonomous AI agent platform featuring a modern React frontend and a Python-powered automation & decision engine backend.

## Project Architecture

```
AgentUI/
├── Akya/                 # Python Agent Backend
│   ├── chatbots.py       # Conversational and task agent routines
│   ├── systemAutomation.py # System and OS automation scripts
│   ├── googleSearch.py   # Search integration
│   ├── webcam.py         # Visual context capture
│   └── main.py           # Core agent orchestrator
├── swayat-ui/            # Modern Frontend Dashboard
│   ├── src/              # React components, state, and UI views
│   ├── backend/          # Interface bridge to Python agent
│   └── package.json      # Frontend dependencies (React, Vite, TailwindCSS)
├── export_project_to_json.py # Project snapshot export utility
└── README.md
```

## Getting Started

### 1. Frontend Setup (`swayat-ui`)
Ensure [Node.js](https://nodejs.org/) is installed:
```bash
cd swayat-ui
npm install
npm run dev
```

### 2. Backend Agent Setup (`Akya`)
Ensure Python 3.8+ is installed:
```bash
cd Akya
python main.py
```
