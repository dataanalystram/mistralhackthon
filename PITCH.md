# VibeForge: 2-Minute Demo Pitch

**Time Limit:** 2 Minutes (Approx. 250-300 words)
**Goal:** Hook the judges, explain the pipeline clearly, and show the "Wow" factor.

---

## 🎙️ The Pitch Script

**(0:00 - 0:30) 1. The Hook (The Problem)**
"Hi everyone, we built **VibeForge**. 
Right now, interacting with AI coding assistants is tedious. You talk to a chatbot, it gives you a bash command or a code snippet, and then *you* have to manually copy, paste, and run it. There’s a massive disconnect between AI reasoning and actual codebase execution. We wanted to fix that by turning natural language into permanent, executable skills."

**(0:30 - 1:15) 2. The Solution (What it does)**
"VibeForge is a **Mistral-powered Context-Aware Skill Engine**. 
Instead of just chatting, you paste in your repository path and hit 'Analyze Codebase'. VibeForge instantly reads your project’s architecture, dependencies, and git history, sending that metadata to **Mistral Large**. Mistral then deductively suggests exactly what custom AI tools you need next—like an automated test runner, a technical debt sweeper, or a deployment script."

**(1:15 - 1:45) 3. How it Works (The Magic Pipeline)**
"Here is where the magic happens. When you select a feature—say, `/ship-demo` or `/fix-ci`—our pipeline kicks in:
1. **Mistral Large** mathematically models your intent into a strict, validated JSON Schema.
2. **Codestral** takes that blueprint and generates a fully autonomous, secure Python execution script.
3. That script is permanently saved directly into your repository’s `.vibe/skills` folder.

It writes the code to *run* the code."

**(1:45 - 2:00) 4. The 'Wow' Factor (Conclusion)**
"It doesn't just give you a snippet. VibeForge automatically spins up a secure sandbox and *executes* the skill directly against your codebase. 

With VibeForge, you aren’t just chatting with an LLM. You are dynamically forging a permanent, personalized AI agent army tailored exactly to your repository. Thank you!"

---

## 💡 Pro-Tips for the Demo
* **Visuals:** When you say "Analyze Codebase", actually click the button and show the judges the glowing premium purple suggestion chips.
* **Execution:** During the "How it Works" section, click to install and **execute** a skill (like `/ship-demo` or `/feature`) so the judges see the live terminal output streaming in the UI.
* **Confidence:** The pipeline is 100% real and uses Mistral Large and Codestral live via API. Emphasize that this is dynamic generation, not just hardcoded presets.
