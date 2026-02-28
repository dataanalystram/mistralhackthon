# VibeForge Demo Script

## Pre-Demo Checklist
- [ ] API server running: `cd apps/api && node server.js`
- [ ] Web UI running: `cd apps/web && npx vite --host`
- [ ] Demo repo has failing tests: `cd demo-repo && npm test` (should show 2 failures)
- [ ] `.env` has valid `MISTRAL_API_KEY`

## 2-Minute Demo Flow

### 0:00 — Setup (10s)
- Open browser to `http://localhost:5173`
- Show the clean 3-panel UI: Transcript | Skill Preview | Pipeline

### 0:10 — Voice Intent (20s)
- Click mic or type: *"Create /fix-ci that runs tests, finds failing output, patches the code, reruns tests, and summarizes the root cause"*
- Show transcript appearing in left panel

### 0:30 — Generate SkillSpec (15s)
- Click **Generate SkillSpec**
- Show the structured JSON: invocation `/fix-ci`, risk level, allowed tools, 5 steps
- Point out: "This is a strict JSON schema — no free-form ambiguity"

### 0:45 — Generate Skill Code (15s)
- Click **Generate Skill**
- Show 3 files created: `SKILL.md`, `scripts/run.py`, `tests/test_smoke.py`
- Quick glance at SKILL.md frontmatter: `user-invocable: true`

### 1:00 — Install Skill (10s)
- Click **Install to .vibe/skills/**
- Show installation path: `.vibe/skills/fix-ci/`
- "This is now a reusable artifact in the repo"

### 1:10 — Execute (30s)
- First show: `demo-repo/` has failing tests (2 red ❌)
- Click **Execute**
- Watch the log stream:
  - Step 1: Tests fail (expected)
  - Step 2: Failures identified
  - Step 3: Patch applied
  - Step 4: Tests rerun — ALL GREEN ✅
  - Step 5: Root cause summary

### 1:40 — The Punchline (20s)
- "VibeForge didn't just fix the bug — it created a **reusable skill** that lives in the repo."
- "Any team member can now run `/fix-ci` on any future failure."
- Show `.vibe/skills/fix-ci/SKILL.md` — this is a versionable, auditable artifact.

## If Things Go Wrong

| Failure | Recovery |
|---|---|
| Mic doesn't work | Type the transcript manually |
| Mistral API fails | Toggle **"Use Golden Path"** for prebaked skills |
| Code generation bad | Golden path auto-fallback activates |
| Execution fails | Click **Dry Run** instead (shows commands) |

## Golden Path Skills (Always Work)
1. `/fix-ci` — Diagnose + patch + rerun tests
2. `/ship-demo` — Run tests + generate release notes
