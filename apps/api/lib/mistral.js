import { Mistral } from '@mistralai/mistralai';

let client = null;

function getClient() {
    if (!client) {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) throw new Error('MISTRAL_API_KEY not set in environment');
        client = new Mistral({ apiKey });
    }
    return client;
}

/**
 * Generate a SkillSpec JSON from a user transcript.
 * Uses Mistral Large 3 with JSON output mode.
 */
export async function generateSkillSpec(transcript) {
    const c = getClient();

    const systemPrompt = `You are a SkillSpec generator for VibeForge. Given a user's spoken intent, produce a valid SkillSpec JSON object.

The SkillSpec must follow this exact structure:
{
  "skill_id": "lowercase-hyphenated-name (3-64 chars)",
  "invocation": "/slash-command-name",
  "title": "Short title (max 80 chars)",
  "description": "What this skill does (max 500 chars)",
  "risk_level": "low" | "medium" | "high",
  "allowed_tools": ["bash", "read_file", "write_file", "grep", "git"],
  "allowed_paths": {
    "read_roots": ["."],
    "write_roots": ["."],
    "deny_globs": [".env", ".ssh/*", "node_modules/*"]
  },
  "steps": [
    {
      "step_id": "step-name",
      "name": "Human-readable step description",
      "tool": "bash",
      "args": { "command": "the actual command to run" },
      "requires_confirmation": false,
      "on_fail": "stop"
    }
  ],
  "success_checks": [
    { "type": "tests_pass", "criteria": { "command": "npm test" } }
  ],
  "fallback_plan": {
    "use_golden_path": true,
    "golden_path_id": "skill-name"
  },
  "notes_for_humans": "Optional notes"
}

Rules:
- skill_id must be lowercase with hyphens only
- invocation must start with /
- steps must be concrete executable commands
- risk_level should be "medium" if any write operations or bash commands are involved
- Always include sensible deny_globs for safety
- Return ONLY the JSON object, nothing else`;

    const response = await c.chat.complete({
        model: 'mistral-large-latest',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Create a SkillSpec for the following user request:\n\n"${transcript}"` }
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0.1
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
}

/**
 * Generate skill files (SKILL.md + run script + test) from a SkillSpec.
 * Uses Devstral / Codestral for code generation.
 */
export async function generateSkillCode(skillSpec) {
    const c = getClient();

    const systemPrompt = `You are a code generator for VibeForge. Given a SkillSpec JSON, generate the files needed for a Mistral Vibe Agent Skill.

You must return a JSON object with this structure:
{
  "files": [
    {
      "path": "SKILL.md",
      "content": "---\\nname: skill-name\\ndescription: ...\\nuser-invocable: true\\nallowed-tools:\\n  - bash\\n  - read_file\\n  - write_file\\n---\\n\\n# Skill Name\\n\\n## Description\\n...\\n\\n## Steps\\n..."
    },
    {
      "path": "scripts/run.py",
      "content": "#!/usr/bin/env python3\\n..."
    },
    {
      "path": "tests/test_smoke.py",
      "content": "#!/usr/bin/env python3\\n..."
    }
  ]
}

Rules for SKILL.md:
- Must have YAML frontmatter with: name, description, user-invocable: true, allowed-tools list
- Must be compatible with Mistral Vibe skill discovery
- Must include clear step descriptions

Rules for scripts/run.py:
- Must be a standalone Python script that implements all steps from the SkillSpec
- Must accept --repo and --dry-run arguments via argparse
- Must print clear status messages for each step
- Must handle errors gracefully
- Must use subprocess for running commands
- Must NOT use any external Python packages beyond stdlib

Rules for tests/test_smoke.py:
- Must be a minimal pytest-compatible test
- Must verify the script exists and is importable
- Must test at least one key behavior

Return ONLY the JSON object.`;

    const response = await c.chat.complete({
        model: 'codestral-latest',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate skill files for this SkillSpec:\n\n${JSON.stringify(skillSpec, null, 2)}` }
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0.1
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
}
