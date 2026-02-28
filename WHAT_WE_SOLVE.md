<div align="center">

# 🧠 What VibeForge Solves

### A Real-World Story That Every Developer Lives

</div>

---

## 😤 The Problem: We Keep Solving the Same Bugs, Every Single Day

Imagine you're Alex, a developer at a startup. It's 11 PM. CI is red. Slack is pinging.

```
❌ CI FAILED — 2 tests failing in math.js
   add(2, 3) expected 5, got -1
```

Alex opens the code. Finds the bug. Fixes it. Pushes. CI turns green. ✅

**Two weeks later**, the same kind of bug happens in a different file. Different dev. Same process:
1. Read the error log
2. Find the file
3. Understand the bug
4. Write the fix
5. Rerun tests
6. Celebrate

**The problem isn't the bug. It's that the process to fix it dies after the chat ends.**

Every AI tool today — ChatGPT, Copilot, Cursor — they all give you a **one-time answer**. Close the chat, and the knowledge is gone. Your teammate will re-prompt the same thing tomorrow.

---

## 💡 The Insight: What If Fixing a Bug Created a Reusable Tool?

What if, instead of just fixing the bug, the AI **created a skill** — a reusable, versionable, shareable automation that lives in your repo forever?

Not a script you paste from Stack Overflow.
Not a chat message that vanishes.
A **real artifact** — code-reviewable, testable, installable.

**That's VibeForge.**

---

## ⚡ What VibeForge Does (In 60 Seconds)

```
                          ┌─────────────────┐
  🎤 "Fix my CI"  ──────▶│   VibeForge     │
                          │                 │
                          │  1. Understand  │──▶ SkillSpec (JSON)
                          │  2. Generate    │──▶ SKILL.md + run.py + tests
                          │  3. Install     │──▶ .vibe/skills/fix-ci/
                          │  4. Execute     │──▶ Bug found → Patched → ✅ Green
                          │  5. Done!       │──▶ Skill is reusable FOREVER
                          └─────────────────┘
```

### Step-by-Step: A Real Run

**You say:** *"Create /fix-ci that runs tests, finds failures, patches the code, reruns tests"*

**VibeForge does:**

| Step | What Happens | Output |
|:---:|:---|:---|
| 📋 | **Mistral Large** analyzes your intent | A strict JSON SkillSpec (not free-form text!) |
| 📁 | **Codestral** generates a skill folder | `SKILL.md` + `scripts/run.py` + `tests/test_smoke.py` |
| 📦 | Skill is installed to your repo | `.vibe/skills/fix-ci/` (git-trackable) |
| ▶️ | Skill executes in a sandboxed runner | Tests fail → Bug found → Patch applied → Tests pass |
| ✅ | Root cause is summarized | "add() used `-` instead of `+`. Fixed." |

**The result isn't just a fix. It's a permanent skill any teammate can run: `/fix-ci`**

---

## 🌍 Real-World Scenarios VibeForge Handles

### 1. `/fix-ci` — Fix Failing Tests
> **Who:** Every dev who gets paged at 2 AM
> **What:** Runs tests → finds failing output → patches the code → reruns → summarizes root cause
> **Why it matters:** The fix becomes a reusable automation, not a one-off chat message

### 2. `/ship-demo` — Prepare for Demo Day
> **Who:** Anyone shipping a demo or release
> **What:** Runs test suite → gathers git log → generates release notes
> **Why it matters:** Consistent, repeatable release process every time

### 3. `/audit-deps` — Check Dependencies *(future)*
> **Who:** Security teams, compliance officers
> **What:** Scans package.json → checks for known CVEs → generates report
> **Why it matters:** Automated security that lives in the repo

### 4. `/onboard-dev` — New Developer Setup *(future)*
> **Who:** New team members on day 1
> **What:** Checks prerequisites → sets up env → runs first build → verifies
> **Why it matters:** Zero-friction onboarding, every time

---

## 🤔 Why Not Just Use ChatGPT / Copilot / Cursor?

<table>
<tr>
<th></th>
<th>ChatGPT / Copilot</th>
<th>VibeForge</th>
</tr>
<tr>
<td><strong>Output</strong></td>
<td>Text in a chat window</td>
<td>A versioned skill folder in your repo</td>
</tr>
<tr>
<td><strong>Reusability</strong></td>
<td>Copy-paste, re-prompt next time</td>
<td>Run <code>/fix-ci</code> forever — anyone, any time</td>
</tr>
<tr>
<td><strong>Audit Trail</strong></td>
<td>Chat disappears when you close it</td>
<td>SKILL.md is code-reviewed in a PR</td>
</tr>
<tr>
<td><strong>Safety</strong></td>
<td>LLM can do anything with your files</td>
<td>Tool allowlists + path restrictions + DRY_RUN</td>
</tr>
<tr>
<td><strong>Sharing</strong></td>
<td>Screenshot a chat? 😅</td>
<td><code>git push</code> — team has the skill</td>
</tr>
<tr>
<td><strong>Testing</strong></td>
<td>None</td>
<td>Every skill has smoke tests</td>
</tr>
</table>

---

## 🏗️ How It's Built (Technical)

```
You speak ──▶ Web Speech API ──▶ Transcript
                                     │
                     ┌───────────────┘
                     ▼
              Mistral Large 3
              (json_object mode)
                     │
                     ▼
              SkillSpec (JSON)  ◀── Ajv Schema Validation
                     │
                     ▼
              Codestral
              (code generation)
                     │
                     ▼
              Skill Folder
              ├── SKILL.md
              ├── scripts/run.py
              └── tests/test_smoke.py
                     │
                     ▼
              .vibe/skills/fix-ci/  ◀── Installed to repo
                     │
                     ▼
              Sandbox Runner
              ├── Timeout (60s/step)
              ├── Secret masking
              ├── DRY_RUN mode
              └── Immutable logs
                     │
                     ▼
              ✅ Tests Green
              📋 Root Cause Summary
```

| Technology | Role |
|:---|:---|
| **Mistral Large** (`mistral-large-latest`) | Understands user intent → produces strict JSON SkillSpec |
| **Codestral** (`codestral-latest`) | Generates multi-file skill code (SKILL.md + scripts + tests) |
| **Web Speech API** | Free, real-time voice input in the browser |
| **Ajv JSON Schema** | Validates every SkillSpec — no ambiguity allowed |
| **Node.js Sandbox** | Executes with timeout, secret masking, DRY_RUN |
| **React + Vite** | Premium dark UI with real-time log streaming |

---

## 🎯 The Key Insight for Judges

> **Most AI tools generate answers. VibeForge generates tools.**
>
> When ChatGPT fixes your bug, the fix dies when you close the tab.
> When VibeForge fixes your bug, it creates a **reusable skill** that lives in your repo,
> can be code-reviewed, tested, and run by any teammate, forever.
>
> **VibeForge doesn't replace developers. It lets them build their own AI-powered tools — with voice.**

---

## 🏆 Why This Wins

1. **Voice-First** — Speak a workflow, don't type a prompt
2. **Durable Artifacts** — Skills are real files, not chat messages
3. **Strict Schemas** — JSON validation, not free-form hope
4. **Safety by Design** — Allowlists, sandboxing, DRY_RUN, secret masking
5. **Graceful Degradation** — Golden paths ensure the demo never breaks
6. **Vibe-Compatible** — Skills install to `.vibe/skills/` for discovery

---

<div align="center">

*"Stop re-prompting. Start forging skills."*

**⚡ VibeForge — Built for the Mistral Worldwide Hackathon 2026 ⚡**

</div>
