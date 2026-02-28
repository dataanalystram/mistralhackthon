<div align="center">

# ⚡ VibeForge

### Voice-to-Skill Engine for Mistral Vibe

**Speak a workflow. Get a verified, reusable Agent Skill. Installed. Executed. Narrated.**

[![Mistral Hackathon](https://img.shields.io/badge/Mistral_Worldwide_Hackathon-2026-7c5cfc?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDdWMTdMNyAxOC41VjkuNUwxMiA3TDE3IDkuNVYxOC41TDIwIDE3VjdMMTIgMloiIGZpbGw9IndoaXRlIi8+PC9zdmc+)](https://hackiterate.com)
[![Track](https://img.shields.io/badge/Track-Anything_Goes-5cfcb0?style=for-the-badge)](#)
[![Stack](https://img.shields.io/badge/Stack-Mistral_Large_3_|_Devstral_|_Voxtral-5c8cfc?style=for-the-badge)](#tech-stack)

<br/>

> *"Most agents have tools. VibeForge **creates** tools — on demand — and installs them into your repo."*

<br/>

</div>

---

## 🎬 The Demo (2 Minutes)

```
🎤 You say:   "Create /fix-ci that runs tests, finds failures, patches the code, 
               reruns tests, and summarizes the root cause"

⚡ VibeForge:  Transcript → SkillSpec (JSON) → Skill Folder → Install → Execute → ✅ Green
```

| Step | What Happens | Time |
|:---:|---|:---:|
| 🎤 | Speak or type your workflow intent | 5s |
| 📋 | VibeForge generates a **strict JSON SkillSpec** via Mistral Large 3 | ~3s |
| 📁 | Devstral produces a full **Agent Skill folder** (SKILL.md + scripts + tests) | ~5s |
| 📦 | Skill is **installed** into `.vibe/skills/` — Vibe-compatible, versionable | instant |
| ▶️ | Skill **executes** in a sandboxed runner: finds bug → patches → reruns tests | ~10s |
| ✅ | **Tests go green**. Root cause narrated. Skill is now reusable by your whole team. | done! |

> **The "wow" isn't the patch — it's that the agent created a _reusable automation skill_, not a one-off completion.**

---

## 💡 Why VibeForge Wins

<table>
<tr>
<td width="50%">

### ❌ What Most Agents Do
- Generate **one-off** answers
- Require re-prompting every time
- No audit trail
- No safety boundaries
- Output disappears after the chat

</td>
<td width="50%">

### ✅ What VibeForge Does
- Creates **durable skill artifacts**
- Skills are **reusable** across repos & team members
- **SKILL.md** is code-reviewable & versionable
- **Tool allowlists** + sandbox execution
- Lives in `.vibe/skills/` — part of your repo forever

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
                    ┌─────────────────────────────────┐
                    │         🎤 Voice / Text          │
                    │      Browser Mic or Paste        │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │    📝 Realtime Transcript         │
                    │   Voxtral Mini Transcribe        │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │  📋 SkillSpec Generator           │
                    │  Mistral Large 3 + JSON Schema   │
                    │  Strict structured output        │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │  🔮 Skill Code Generator          │
                    │  Devstral / Codestral             │
                    │  → SKILL.md + scripts + tests     │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │  📦 Install to .vibe/skills/      │
                    │  Vibe-compatible discovery path   │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │  ▶️  Sandbox Runner                │
                    │  Timeout · DRY_RUN · Secret Mask │
                    │  Step-by-step log capture         │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │  🔊 Narration & Results           │
                    │  Streaming logs · ElevenLabs TTS  │
                    └─────────────────────────────────┘
```

### Project Structure

```
vibeforge/
├── apps/
│   ├── web/                    # React + Vite frontend (port 5173)
│   │   └── src/
│   │       ├── App.jsx         # 3-panel UI: Transcript | Preview | Pipeline
│   │       └── index.css       # Premium dark theme with glassmorphism
│   └── api/                    # Express.js backend (port 3001)
│       ├── server.js           # API server entry point
│       ├── routes/sessions.js  # Full pipeline endpoints
│       └── lib/
│           ├── mistral.js      # Mistral Large 3 + Codestral clients
│           ├── runner.js       # Sandbox executor (timeout, secrets, DRY_RUN)
│           ├── skillspec-schema.js  # SkillSpec JSON schema + Ajv validator
│           └── golden-paths.js     # Prebaked /fix-ci and /ship-demo skills
├── demo-repo/                  # Test repo with intentional bug
│   ├── src/math.js             # 🐛 add() uses subtraction (the bug!)
│   └── test.js                 # Tests that catch the bug
├── .vibe/skills/               # Installed skills (Vibe-compatible)
│   ├── fix-ci/                 # /fix-ci skill
│   │   ├── SKILL.md
│   │   ├── scripts/run.py
│   │   └── tests/test_smoke.py
│   └── ship-demo/              # /ship-demo skill
│       ├── SKILL.md
│       ├── scripts/run.py
│       └── tests/test_smoke.py
├── generated_skills/           # Runtime output directory
├── DEMO.md                     # Step-by-step demo script
└── README.md                   # You are here!
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **🎤 Speech-to-Text** | Voxtral Mini Transcribe Realtime | Streaming ASR with configurable latency |
| **📋 SkillSpec** | **Mistral Large 3** | Structured JSON output via `json_object` response format |
| **🔮 Code Generation** | **Codestral / Devstral** | Multi-file skill code generation (SKILL.md + scripts + tests) |
| **▶️ Execution** | Node.js Sandbox Runner | Subprocess with timeout, DRY_RUN, secret masking |
| **🔊 Narration** | ElevenLabs TTS *(optional)* | Streaming voice narration of results |
| **🎨 Frontend** | React + Vite | 3-panel dark UI with glassmorphism |
| **🔧 Backend** | Express.js | REST API with session state management |
| **✅ Validation** | Ajv JSON Schema | Strict SkillSpec enforcement — no free-form ambiguity |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **Python 3.8+** (for skill scripts)
- **Mistral API Key** → [Get one here](https://console.mistral.ai/)

### 1. Clone & Install

```bash
git clone https://github.com/dataanalystram/mistralhackthon.git
cd mistralhackthon/vibeforge

# Install API dependencies
cd apps/api && npm install

# Install Web dependencies  
cd ../web && npm install
```

### 2. Configure

```bash
# Copy the example env and add your Mistral API key
cp .env.example .env
# Edit .env → set MISTRAL_API_KEY=your_key_here
```

### 3. Run

```bash
# Terminal 1: Start API server
cd apps/api && node server.js
# → 🔥 VibeForge API running on http://localhost:3001

# Terminal 2: Start Web UI
cd apps/web && npx vite --host
# → VITE ready on http://localhost:5173
```

### 4. Demo!

Open **http://localhost:5173** and follow the [Demo Script →](DEMO.md)

---

## 🎯 API Endpoints

| Method | Endpoint | Description |
|:---:|:---|:---|
| `POST` | `/api/sessions` | Create a new voice-to-skill session |
| `POST` | `/api/sessions/:id/transcript` | Submit transcript text |
| `POST` | `/api/sessions/:id/skillspec` | Generate SkillSpec via Mistral Large 3 |
| `POST` | `/api/sessions/:id/skill/generate` | Generate skill folder via Devstral |
| `POST` | `/api/sessions/:id/skill/install` | Install skill to `.vibe/skills/` |
| `POST` | `/api/sessions/:id/skill/run` | Execute skill in sandbox |
| `GET` | `/api/health` | Health check |

### Example: Full Pipeline via CLI

```bash
# 1. Create session
SESSION=$(curl -s -X POST http://localhost:3001/api/sessions \
  -H 'Content-Type: application/json' -d '{}' | jq -r '.session_id')

# 2. Generate SkillSpec
curl -s -X POST "http://localhost:3001/api/sessions/$SESSION/skillspec" \
  -H 'Content-Type: application/json' \
  -d '{"transcript":"Create /fix-ci that runs tests, patches failures, reruns"}' | jq .

# 3. Generate Skill Code
curl -s -X POST "http://localhost:3001/api/sessions/$SESSION/skill/generate" \
  -H 'Content-Type: application/json' -d '{}' | jq .

# 4. Install
curl -s -X POST "http://localhost:3001/api/sessions/$SESSION/skill/install" \
  -H 'Content-Type: application/json' -d '{}' | jq .

# 5. Execute!
curl -s -X POST "http://localhost:3001/api/sessions/$SESSION/skill/run" \
  -H 'Content-Type: application/json' -d '{"dry_run":false}' | jq .
```

---

## 📋 SkillSpec Schema

Every skill starts as a **strict JSON** specification — no free-form ambiguity:

```json
{
  "skill_id": "fix-ci",
  "invocation": "/fix-ci",
  "title": "Fix CI — Diagnose & Patch Failing Tests",
  "description": "Runs tests, identifies failures, patches code, reruns tests",
  "risk_level": "medium",
  "allowed_tools": ["bash", "read_file", "write_file", "grep"],
  "allowed_paths": {
    "read_roots": ["."],
    "write_roots": ["."],
    "deny_globs": [".env", ".ssh/*", "node_modules/*"]
  },
  "steps": [
    { "step_id": "run-tests", "name": "Run test suite", "tool": "bash", 
      "args": { "command": "npm test" }, "on_fail": "continue" },
    { "step_id": "apply-patch", "name": "Apply fix", "tool": "bash",
      "args": { "command": "sed ..." }, "requires_confirmation": true }
  ],
  "success_checks": [
    { "type": "tests_pass", "criteria": { "command": "npm test" } }
  ]
}
```

---

## 🛡️ Safety & Sandboxing

| Feature | Description |
|:---|:---|
| **Tool Allowlist** | Every skill declares which tools it can use in `SKILL.md` |
| **Path Restrictions** | Explicit read/write roots + deny globs (`.env`, `.ssh/`, etc.) |
| **Confirmation Gates** | Risky steps require explicit user approval in the UI |
| **DRY_RUN Mode** | Preview all commands without executing |
| **Secret Masking** | API keys, tokens, and passwords auto-redacted from logs |
| **Timeout Enforcement** | 60s per step, 300s total — no runaway processes |
| **Immutable Logs** | Every executed command is timestamped and logged |

---

## 🏆 Hackathon Award Alignment

<table>
<tr>
<td align="center" width="33%">

### 🎤 Best Voice Use Case
*ElevenLabs Award*

Voice-first interface: speak a workflow, hear results narrated back

</td>
<td align="center" width="33%">

### ⚡ Best Use of Mistral Vibe
*Mistral Award*

Generates & installs Vibe-compatible skill folders with proper SKILL.md frontmatter

</td>
<td align="center" width="33%">

### 🤖 Best Agent Skills

Creates reusable, auditable Agent Skills — not one-off completions

</td>
</tr>
</table>

---

## 🎮 Demo Skills Included

### `/fix-ci` — Diagnose & Patch Failing Tests
> Runs `npm test` → identifies failures → patches buggy code → reruns tests → summary

The demo repo includes an **intentional bug**: `add()` uses subtraction instead of addition.
`/fix-ci` finds it, patches it, and gets tests green.

### `/ship-demo` — Tests + Release Notes  
> Runs tests → gathers `git log` → generates formatted release notes

Safe, read-only skill for shipping demos with confidence.

### 🛡️ Golden Path Guarantee
Both skills have **prebaked fallback versions** that work even if the Mistral API is unreachable.
Toggle "Use Golden Path" in the UI for guaranteed demo success.

---

## 🧠 How It's Built

**1. Structured Generation, Not Prompting**  
VibeForge doesn't just "prompt an LLM." It uses Mistral's `json_object` response format to produce schema-validated SkillSpecs. The output is deterministic and verifiable.

**2. Durable Artifacts, Not Chat Messages**  
The output is a real directory with real files (`SKILL.md`, `run.py`, `test_smoke.py`) that can be committed to git, code-reviewed, and reused across projects.

**3. Defense in Depth**  
Tool allowlists → path restrictions → confirmation gates → sandbox execution → secret masking → immutable logs. Every layer adds safety.

**4. Graceful Degradation**  
If speech fails → paste text. If Mistral fails → golden path. If execution fails → dry run. The demo cannot break.

---

## 👥 Team

Built with ❤️ during the **Mistral Worldwide Hackathon 2026** (Online Edition)

---

<div align="center">

*"VibeForge turns voice instructions into versioned, reusable agent skills — so teams stop re-prompting and start shipping."*

**⚡ Built for Mistral. Powered by Voice. Secured by Design. ⚡**

</div>
