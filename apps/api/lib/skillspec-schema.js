import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

export const SKILLSPEC_SCHEMA = {
    "title": "SkillSpec",
    "type": "object",
    "required": [
        "skill_id", "invocation", "title", "description",
        "risk_level", "allowed_tools", "steps"
    ],
    "properties": {
        "skill_id": {
            "type": "string",
            "pattern": "^[a-z0-9-]{3,64}$"
        },
        "invocation": {
            "type": "string",
            "pattern": "^/[a-z0-9-]{2,32}$"
        },
        "title": { "type": "string", "maxLength": 80 },
        "description": { "type": "string", "maxLength": 500 },
        "risk_level": { "type": "string", "enum": ["low", "medium", "high"] },
        "allowed_tools": {
            "type": "array",
            "items": { "type": "string" }
        },
        "allowed_paths": {
            "type": "object",
            "properties": {
                "read_roots": { "type": "array", "items": { "type": "string" } },
                "write_roots": { "type": "array", "items": { "type": "string" } },
                "deny_globs": { "type": "array", "items": { "type": "string" } }
            }
        },
        "steps": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": ["step_id", "name", "tool", "args"],
                "properties": {
                    "step_id": { "type": "string" },
                    "name": { "type": "string", "maxLength": 120 },
                    "tool": { "type": "string" },
                    "args": { "type": "object" },
                    "requires_confirmation": { "type": "boolean" },
                    "on_fail": { "type": "string", "enum": ["stop", "continue", "fallback", "ask_user"] }
                }
            }
        },
        "success_checks": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["type", "criteria"],
                "properties": {
                    "type": { "type": "string", "enum": ["tests_pass", "command_exit_0", "file_contains", "diff_nonempty"] },
                    "criteria": { "type": "object" }
                }
            }
        },
        "fallback_plan": {
            "type": "object",
            "properties": {
                "use_golden_path": { "type": "boolean" },
                "golden_path_id": { "type": "string" }
            }
        },
        "notes_for_humans": { "type": "string" }
    },
    "additionalProperties": false
};

const validate = ajv.compile(SKILLSPEC_SCHEMA);

export function validateSkillSpec(data) {
    const valid = validate(data);
    return {
        valid,
        errors: valid ? null : validate.errors.map(e => `${e.instancePath} ${e.message}`).join('; ')
    };
}
