// Mistral AI client — SkillSpec generation (Mistral Large) + Code generation (Codestral)
import { Mistral } from '@mistralai/mistralai';

// Model IDs from https://docs.mistral.ai/getting-started/models
// SkillSpec generation → Mistral Large (best for structured JSON reasoning)
const SKILLSPEC_MODEL = 'mistral-large-latest';
// Code generation → Codestral (specialized for code tasks, 256k context)
const CODEGEN_MODEL = 'codestral-latest';

let client = null;

function getClient() {
    if (!client) {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey || apiKey === 'your_mistral_api_key_here') {
            throw new Error('MISTRAL_API_KEY not set in .env');
        }
        client = new Mistral({ apiKey });
    }
    return client;
}

/**
 * Generate a SkillSpec JSON from a user transcript.
 * Uses Mistral Large with json_object response format for strict structured output.
 */
export async function generateSkillSpec(transcript) {
    const mistral = getClient();

    const systemPrompt = `You are VibeForge — a system that converts user voice commands into structured Agent Skill specifications.

Given a user's spoken intent, produce a JSON object matching this EXACT schema:

{
  "skill_id": "string (kebab-case, e.g. fix-ci)",
  "invocation": "string (slash command, e.g. /fix-ci)",
  "title": "string (human-readable title)",
  "description": "string (1-2 sentence description)",
  "risk_level": "low | medium | high",
  "allowed_tools": ["bash", "read_file", "write_file", "grep", "git"],
  "allowed_paths": {
    "read_roots": ["."],
    "write_roots": ["."],
    "deny_globs": [".env", ".ssh/*", "node_modules/*"]
  },
  "steps": [
    {
      "step_id": "string (kebab-case)",
      "name": "string (human-readable step name)",
      "tool": "bash",
      "args": { "command": "string (the shell command)" },
      "requires_confirmation": false,
      "on_fail": "continue | stop"
    }
  ],
  "success_checks": [
    { "type": "tests_pass", "criteria": { "command": "npm test" } }
  ],
  "fallback_plan": {
    "use_golden_path": true,
    "golden_path_id": "same as skill_id"
  },
  "notes_for_humans": "string (brief explanation)"
}

RULES:
- Output ONLY valid JSON. No markdown, no code fences, no explanation.
- skill_id must be kebab-case (lowercase with hyphens).
- Each step must have a concrete shell command in args.command.
- For file modifications, use sed, patch, or echo with redirection.
- First step should always be diagnostic (run tests, check status).
- Last step should summarize results.
- Set requires_confirmation: true for destructive operations (file writes, deletions).
- on_fail: "continue" for diagnostic steps, "stop" for critical steps.
- risk_level: "low" for read-only, "medium" for file edits, "high" for system changes.
- deny_globs must always include .env and .ssh/*.`;

    const response = await mistral.chat.complete({
        model: SKILLSPEC_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `User said: "${transcript}"\n\nGenerate the SkillSpec JSON:` }
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0.3,
        maxTokens: 2000
    });

    const content = response.choices[0].message.content;

    try {
        const skillSpec = JSON.parse(content);
        return skillSpec;
    } catch (e) {
        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Failed to parse SkillSpec JSON from Mistral response');
    }
}

/**
 * Generate skill code files from a SkillSpec.
 * Uses Codestral for high-quality code generation.
 * Returns { files: [{ path, content }] }
 */
export async function generateSkillCode(skillSpec) {
    const mistral = getClient();

    const systemPrompt = `You are VibeForge Code Generator. Given a SkillSpec JSON, generate a complete Agent Skill folder with these files:

1. SKILL.md — Frontmatter (YAML) + documentation (Markdown)
2. scripts/run.py — Python runner script
3. tests/test_smoke.py — Smoke tests

Output ONLY a JSON object with this structure:
{
  "files": [
    { "path": "SKILL.md", "content": "---\\nname: ...\\n---\\n# ..." },
    { "path": "scripts/run.py", "content": "#!/usr/bin/env python3\\n..." },
    { "path": "tests/test_smoke.py", "content": "#!/usr/bin/env python3\\n..." }
  ]
}

SKILL.md FORMAT:
---
name: {skill_id}
description: {description}
user-invocable: true
allowed-tools:
  - bash
  - read_file
  - write_file
---
# /{invocation}
## Description
{description}
## Steps
1. **Step name** — \`command\`
...
## Safety
- List safety measures

scripts/run.py FORMAT:
- Accept --repo and --dry-run arguments
- Implement each step from the SkillSpec
- Print clear progress indicators
- Handle errors gracefully
- Return appropriate exit codes

tests/test_smoke.py FORMAT:
- test_script_exists() — verify run.py exists
- test_dry_run() — run script with --dry-run flag
- Print test results

RULES:
- Output ONLY valid JSON
- All file contents must be properly escaped strings
- Python scripts must be executable and well-documented
- Use subprocess for shell commands in run.py`;

    const response = await mistral.chat.complete({
        model: CODEGEN_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate skill folder for this SkillSpec:\n\n${JSON.stringify(skillSpec, null, 2)}` }
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0.2,
        maxTokens: 4000
    });

    const content = response.choices[0].message.content;

    try {
        const result = JSON.parse(content);
        return result;
    } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Failed to parse skill code JSON from Codestral response');
    }
}

/**
 * Generate context-aware skill suggestions based on codebase metadata.
 * Uses Mistral Large to analyze package.json, README, and file tree.
 */
export async function analyzeRepo(repoContext) {
    const mistral = getClient();

    const systemPrompt = `You are VibeForge's Context-Aware Suggestion Engine.
Given a summary of a user's repository, suggest 3 highly personalized, strictly actionable AI Skills that could be generated to automate tasks in THEIR specific codebase.

Output ONLY a JSON object with this exact structure:
{
  "suggestions": [
    {
      "title": "string (Short, punchy title, e.g., 'Lint & Fix Code')",
      "command": "string (The exact transcript command the user should use to generate the skill, e.g., 'Create /lint-fix that runs eslint --fix on all files')"
    }
  ]
}

RULES:
1. ONLY suggest 3 skills.
2. The 'command' property must read like a prompt the user can directly send to VibeForge to generate the skill (start it with "Create /<skillname> that...").
3. Tailor suggestions to the tech stack (e.g. if you see Jest in package.json, suggest a test runner skill. If you see Dockerfile, suggest a build skill).
4. Output strictly valid JSON.`;

    const userMessage = `Repository Context:
${repoContext.files_preview ? `Root files: ${repoContext.files_preview.join(', ')}` : 'No files listed.'}
${repoContext.package_json ? `Dependencies: ${JSON.stringify(repoContext.package_json.dependencies || {})}\nDevDependencies: ${JSON.stringify(repoContext.package_json.devDependencies || {})}` : 'No package.json found.'}
${repoContext.readme_preview ? `README Extract: ${repoContext.readme_preview}` : 'No README.'}

Analyze this context and suggest 3 specialized VibeForge skills.`;

    const response = await mistral.chat.complete({
        model: SKILLSPEC_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0.5,
        maxTokens: 1000
    });

    const content = response.choices[0].message.content;

    try {
        const result = JSON.parse(content);
        return result.suggestions || [];
    } catch (e) {
        throw new Error('Failed to parse analysis JSON from Mistral response');
    }
}
