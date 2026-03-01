<div align="center">

# ⚡ VibeForge

### Context-Aware Agent Skill Engine

**Describe a workflow. Get a verified, reusable AI skill. Installed. Executed. Permanent.**

[![Mistral Hackathon](https://img.shields.io/badge/Mistral_Worldwide_Hackathon-2026-7c5cfc?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDdWMTdMNyAxOC41VjkuNUwxMiA3TDE3IDkuNVYxOC41TDIwIDE3VjdMMTIgMloiIGZpbGw9IndoaXRlIi8+PC9zdmc+)](https://hackiterate.com)
[![Track](https://img.shields.io/badge/Track-Anything_Goes-5cfcb0?style=for-the-badge)](#)
[![Stack](https://img.shields.io/badge/Stack-Mistral_Large_3_|_Codestral-5c8cfc?style=for-the-badge)](#tech-stack)

<br/>

> *"Most coding assistants give you snippets. VibeForge **creates** tools — on demand — and installs them into your repo."*

<br/>

</div>

---

## 🎬 The Demo (2 Minutes)

```text
💬 You type:  "Create /fix-ci that runs tests, finds failures, patches the code, 
               reruns tests, and summarizes the root cause"

⚡ VibeForge:  Context Analysis → SkillSpec (JSON) → Skill Folder → Install → Execute → ✅ Green
```

| Step | What Happens | Time |
|:---:|---|:---:|
| 💬 | Type your requested workflow based on codebase context | 5s |
| 📋 | VibeForge generates a **strict JSON SkillSpec** via Mistral Large 3 | ~3s |
| 📁 | Codestral produces a full **Agent Skill folder** (SKILL.md + Scripts + Tests) | ~5s |
| 📦 | Skill is **installed** into `.vibe/skills/` — Vibe-compatible, versionable | instant |
| ▶️ | Skill **executes** in a sandboxed runner: finds bug → patches → reruns tests | ~10s |
| ✅ | **Tests go green**. Results summarized. Skill is now reusable by your whole team. | done! |

> **The "wow" isn't the patch — it's that the agent created a _reusable automation skill_, not a one-off completion.**

---

## 💡 Why VibeForge Wins

<table>
<tr>
<td width="50%">

### ❌ What Most Assistants Do
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
- **Context-Aware Codebase** static analysis
- Lives in `.vibe/skills/` — part of your repo forever

</td>
</tr>
</table>

---

## 🏗️ Architecture

```text
                    ┌─────────────────────────────────┐
                    │      🔍 Codebase Analyzer        │
                    │   Reads file structure & TODOs   │
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
                    │  Codestral / Devstral             │
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
                    └─────────────────────────────────┘
```

### Project Structure

```text
vibeforge/
├── apps/
│   ├── web/                    # React + Vite frontend (port 5173)
│   │   └── src/
│   │       ├── App.jsx         # 3-panel UI: Context | Preview | Pipeline
│   │       └── index.css       # Premium dark theme with glowing magic UI
│   └── api/                    # Express.js backend (port 3001)
│       ├── server.js           # API server entry point
│       ├── routes/sessions.js  # Full pipeline endpoints
│       └── lib/
│           ├── mistral.js      # Mistral Large 3 + Codestral clients
│           ├── runner.js       # Sandbox executor (timeout, secrets, DRY_RUN)
│           ├── skillspec-schema.js  # SkillSpec JSON schema + Ajv validator
│           └── golden-paths.js     # Prebaked /feature, /fix-ci and /ship-demo skills
├── demo-repo/                  # Test repo with intentional bug
...
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **🔍 Context Analyzer** | **Mistral Large 3** | Reads repository metadata to suggest missing features |
| **📋 SkillSpec** | **Mistral Large 3** | Structured JSON output via `json_object` response format |
| **🔮 Code Gen** | **Codestral** | Multi-file Python skill code generation |
| **▶️ Execution** | Node.js / Python Sandbox | Subprocess with timeout, DRY_RUN, secret masking |
| **🎨 Frontend** | React + Vite | 3-panel dark UI with glassmorphism |
| **🔧 Backend** | Express.js | REST API with session state management |
| **✅ Validation** | Ajv JSON Schema | Strict SkillSpec enforcement — no free-form ambiguity |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **Python 3.8+**
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

Open **http://localhost:5173** and follow the prompt suggestions!

---

## 🎯 API Endpoints

| Method | Endpoint | Description |
|:---:|:---|:---|
| `POST` | `/api/analyze-repo` | Extract repo context and get Mistral suggestions |
| `POST` | `/api/sessions` | Create a new skill generation session |
| `POST` | `/api/sessions/:id/skillspec` | Generate SkillSpec via Mistral Large 3 |
| `POST` | `/api/sessions/:id/skill/generate` | Generate skill folder via Codestral |
| `POST` | `/api/sessions/:id/skill/install` | Install skill to target repository folder |
| `POST` | `/api/sessions/:id/skill/run` | Execute Python skill safely in sandbox |
| `GET`  | `/api/health` | Diagnostic status of the API |

---

## 🛡️ Safety & Sandboxing

| Feature | Description |
|:---|:---|
| **Tool Allowlist** | Every skill declares which tools it can use in `SKILL.md` |
| **Path Restrictions** | Explicit read/write roots + deny globs (`.env`, `.ssh/`, etc.) |
| **Confirmation Gates** | Risky steps require explicit user approval in the CLI |
| **DRY_RUN Mode** | Preview all Python sandbox commands without executing |
| **Secret Masking** | API keys, tokens, and passwords auto-redacted from logs |
| **Timeout Enforcement** | 60s per step, 300s total — no runaway processes |

---

## 🎮 Demo Skills Included (The "Golden Paths")

### 1. `/feature` — Context-Aware Codebase Insight
> Scans git history → checks for TODOs → inspects file tree → synthesizes AI recommendations for your next immediate MVP features to build!

### 2. `/fix-ci` — Diagnose & Patch Failing Tests
> Runs `npm test` → identifies failures → patches buggy code → reruns tests → summary
> *(The demo repo includes an intentional bug for it to catch!)*

### 3. `/ship-demo` — Tests + Release Notes  
> Runs tests → gathers `git log` → generates formatted release notes ready to present.

***

<div align="center">

*"Stop re-prompting. Start forging skills."*

**⚡ VibeForge — Built by Ramprasad Somaraju for the Mistral Worldwide Hackathon 2026 ⚡**

</div>
