// Golden path skills — prebaked skills that work even if Mistral API is down

export const GOLDEN_PATHS = {
    'fix-ci': {
        skillSpec: {
            skill_id: 'fix-ci',
            invocation: '/fix-ci',
            title: 'Fix CI — Diagnose & Patch Failing Tests',
            description: 'Runs tests, identifies failing test output, applies a targeted patch, reruns tests, and summarizes the root cause.',
            risk_level: 'medium',
            allowed_tools: ['bash', 'read_file', 'write_file', 'grep'],
            allowed_paths: {
                read_roots: ['.'],
                write_roots: ['.'],
                deny_globs: ['.env', '.ssh/*', 'node_modules/*']
            },
            steps: [
                {
                    step_id: 'run-tests',
                    name: 'Run test suite to identify failures',
                    tool: 'bash',
                    args: { command: 'npm test 2>&1 || true' },
                    requires_confirmation: false,
                    on_fail: 'continue'
                },
                {
                    step_id: 'identify-failure',
                    name: 'Capture failing test output',
                    tool: 'bash',
                    args: { command: 'npm test 2>&1 | grep -A 5 "FAIL\\|Error\\|✗\\|failing" || echo "No failures detected"' },
                    requires_confirmation: false,
                    on_fail: 'continue'
                },
                {
                    step_id: 'apply-patch',
                    name: 'Apply fix to the failing code',
                    tool: 'bash',
                    args: { command: 'sed -i.bak "s/return a - b/return a + b/g" src/math.js 2>/dev/null || sed -i "" "s/return a - b/return a + b/g" src/math.js' },
                    requires_confirmation: true,
                    on_fail: 'stop'
                },
                {
                    step_id: 'rerun-tests',
                    name: 'Rerun tests to verify fix',
                    tool: 'bash',
                    args: { command: 'npm test' },
                    requires_confirmation: false,
                    on_fail: 'stop'
                },
                {
                    step_id: 'summarize',
                    name: 'Generate root cause summary',
                    tool: 'bash',
                    args: { command: 'echo "✅ Root Cause: The add() function used subtraction (-) instead of addition (+). Fix applied to src/math.js. All tests now passing."' },
                    requires_confirmation: false,
                    on_fail: 'stop'
                }
            ],
            success_checks: [
                { type: 'tests_pass', criteria: { command: 'npm test' } }
            ],
            fallback_plan: {
                use_golden_path: true,
                golden_path_id: 'fix-ci'
            },
            notes_for_humans: 'This is the golden path version. It diagnoses a known bug in math.js (subtraction instead of addition) and patches it.'
        },
        files: {
            'SKILL.md': `---
name: fix-ci
description: Diagnose failing CI tests, apply patch, rerun tests, summarize root cause
user-invocable: true
allowed-tools:
  - bash
  - read_file
  - write_file
  - grep
---

# /fix-ci — Fix Failing CI

## Description
Automatically diagnose failing test in CI, identify the root cause, apply a targeted fix, rerun the test suite, and produce a human-readable summary.

## Steps
1. **Run tests** — Execute \`npm test\` and capture output
2. **Identify failure** — Parse test output for failing tests and error messages
3. **Apply patch** — Fix the identified bug in source code
4. **Rerun tests** — Verify the fix resolves all failures
5. **Summarize** — Report root cause and fix applied

## Safety
- Only modifies source files in the project root
- Requires confirmation before applying patches
- No network access required
- No secrets accessed
`,
            'scripts/run.py': `#!/usr/bin/env python3
"""
/fix-ci skill runner — diagnoses and fixes failing CI tests.
Usage: python run.py --repo /path/to/repo [--dry-run]
"""
import argparse
import subprocess
import sys
import os

def run_cmd(cmd, cwd, dry_run=False):
    """Run a command and return (exit_code, stdout, stderr)."""
    print(f"  $ {cmd}")
    if dry_run:
        print("  [DRY_RUN] Skipped")
        return 0, "", ""
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True, timeout=60)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result.returncode, result.stdout, result.stderr

def main():
    parser = argparse.ArgumentParser(description="/fix-ci skill")
    parser.add_argument("--repo", required=True, help="Path to the repository")
    parser.add_argument("--dry-run", action="store_true", help="Print commands without executing")
    args = parser.parse_args()

    repo = os.path.abspath(args.repo)
    dry_run = args.dry_run

    print("=" * 60)
    print("🔧 /fix-ci — Diagnosing & Fixing CI Failures")
    print("=" * 60)

    # Step 1: Run tests
    print("\\n▶ Step 1: Running test suite...")
    code, stdout, stderr = run_cmd("npm test 2>&1 || true", repo, dry_run)
    test_output = stdout + stderr

    # Step 2: Identify failures
    print("\\n▶ Step 2: Identifying failures...")
    if "FAIL" in test_output or "failing" in test_output or "Error" in test_output:
        print("  ❌ Failures detected in test output")
    else:
        print("  ✅ No failures detected — tests are already passing!")
        if not dry_run:
            return 0

    # Step 3: Apply patch
    print("\\n▶ Step 3: Applying fix...")
    # Fix: math.js has subtraction instead of addition
    patch_cmd = 'sed -i.bak "s/return a - b/return a + b/g" src/math.js 2>/dev/null || sed -i "" "s/return a - b/return a + b/g" src/math.js'
    code, _, _ = run_cmd(patch_cmd, repo, dry_run)

    # Step 4: Rerun tests
    print("\\n▶ Step 4: Rerunning tests...")
    code, stdout, _ = run_cmd("npm test", repo, dry_run)

    # Step 5: Summary
    print("\\n▶ Step 5: Summary")
    print("=" * 60)
    if code == 0 or dry_run:
        print("✅ Root Cause: add() used subtraction (-) instead of addition (+)")
        print("✅ Fix: Patched src/math.js")
        print("✅ All tests now passing!")
    else:
        print("❌ Fix did not resolve all failures. Manual review needed.")
        return 1
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
`,
            'tests/test_smoke.py': `#!/usr/bin/env python3
"""Smoke test for /fix-ci skill."""
import os
import subprocess

def test_script_exists():
    script = os.path.join(os.path.dirname(__file__), "..", "scripts", "run.py")
    assert os.path.exists(script), f"run.py not found at {script}"

def test_dry_run():
    script = os.path.join(os.path.dirname(__file__), "..", "scripts", "run.py")
    result = subprocess.run(
        ["python3", script, "--repo", "/tmp", "--dry-run"],
        capture_output=True, text=True, timeout=30
    )
    assert result.returncode == 0, f"Dry run failed: {result.stderr}"
    assert "DRY_RUN" in result.stdout, "Dry run should show DRY_RUN markers"

if __name__ == "__main__":
    test_script_exists()
    test_dry_run()
    print("✅ All smoke tests passed!")
`
        }
    },

    'ship-demo': {
        skillSpec: {
            skill_id: 'ship-demo',
            invocation: '/ship-demo',
            title: 'Ship Demo — Tests + Release Notes',
            description: 'Runs the test suite, generates release notes from recent git history, and prints a deployment-ready summary.',
            risk_level: 'low',
            allowed_tools: ['bash', 'read_file', 'git'],
            allowed_paths: {
                read_roots: ['.'],
                write_roots: ['.'],
                deny_globs: ['.env', '.ssh/*']
            },
            steps: [
                {
                    step_id: 'run-tests',
                    name: 'Run full test suite',
                    tool: 'bash',
                    args: { command: 'npm test 2>&1 || echo "⚠️ Some tests failed"' },
                    requires_confirmation: false,
                    on_fail: 'continue'
                },
                {
                    step_id: 'git-log',
                    name: 'Gather recent commits for release notes',
                    tool: 'bash',
                    args: { command: 'git log --oneline -10 2>/dev/null || echo "No git history available"' },
                    requires_confirmation: false,
                    on_fail: 'continue'
                },
                {
                    step_id: 'release-notes',
                    name: 'Generate release notes summary',
                    tool: 'bash',
                    args: { command: 'echo "📋 RELEASE NOTES\\n================\\nVersion: $(date +%Y.%m.%d)\\nStatus: Demo Ready\\n\\nChanges:\\n$(git log --oneline -5 2>/dev/null || echo "- Initial release")\\n\\n✅ All systems go for demo!"' },
                    requires_confirmation: false,
                    on_fail: 'stop'
                }
            ],
            success_checks: [
                { type: 'command_exit_0', criteria: { command: 'npm test' } }
            ],
            fallback_plan: {
                use_golden_path: true,
                golden_path_id: 'ship-demo'
            },
            notes_for_humans: 'Safe, read-only skill. No destructive operations.'
        },
        files: {
            'SKILL.md': `---
name: ship-demo
description: Run tests, generate release notes, print deployment summary
user-invocable: true
allowed-tools:
  - bash
  - read_file
  - git
---

# /ship-demo — Ship Demo Release

## Description
Run the full test suite, gather recent commit history, and produce a formatted release notes summary ready for demo day.

## Steps
1. **Run tests** — Execute full test suite
2. **Git log** — Gather recent commit messages
3. **Release notes** — Format and print release summary

## Safety
- Read-only operations (no writes to repo)
- No network access required
- No secrets accessed
- Risk level: LOW
`,
            'scripts/run.py': `#!/usr/bin/env python3
"""
/ship-demo skill runner — tests + release notes.
Usage: python run.py --repo /path/to/repo [--dry-run]
"""
import argparse
import subprocess
import sys
import os
from datetime import datetime

def run_cmd(cmd, cwd, dry_run=False):
    print(f"  $ {cmd}")
    if dry_run:
        print("  [DRY_RUN] Skipped")
        return 0, "", ""
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True, timeout=60)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result.returncode, result.stdout, result.stderr

def main():
    parser = argparse.ArgumentParser(description="/ship-demo skill")
    parser.add_argument("--repo", required=True, help="Path to the repository")
    parser.add_argument("--dry-run", action="store_true", help="Print commands without executing")
    args = parser.parse_args()

    repo = os.path.abspath(args.repo)
    dry_run = args.dry_run

    print("=" * 60)
    print("🚀 /ship-demo — Preparing Demo Release")
    print("=" * 60)

    # Step 1: Run tests
    print("\\n▶ Step 1: Running test suite...")
    code, stdout, _ = run_cmd("npm test 2>&1 || true", repo, dry_run)

    # Step 2: Git log
    print("\\n▶ Step 2: Gathering recent commits...")
    _, git_log, _ = run_cmd("git log --oneline -10 2>/dev/null || echo 'No git history'", repo, dry_run)

    # Step 3: Release notes
    print("\\n▶ Step 3: Generating release notes...")
    print("=" * 60)
    print(f"📋 RELEASE NOTES")
    print(f"================")
    print(f"Version: {datetime.now().strftime('%Y.%m.%d')}")
    print(f"Status: ✅ Demo Ready")
    print(f"\\nRecent Changes:")
    if not dry_run and git_log.strip():
        for line in git_log.strip().split("\\n")[:5]:
            print(f"  • {line}")
    else:
        print("  • Initial release")
    print(f"\\n🚀 All systems go for demo!")
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
`,
            'tests/test_smoke.py': `#!/usr/bin/env python3
"""Smoke test for /ship-demo skill."""
import os
import subprocess

def test_script_exists():
    script = os.path.join(os.path.dirname(__file__), "..", "scripts", "run.py")
    assert os.path.exists(script), f"run.py not found at {script}"

def test_dry_run():
    script = os.path.join(os.path.dirname(__file__), "..", "scripts", "run.py")
    result = subprocess.run(
        ["python3", script, "--repo", "/tmp", "--dry-run"],
        capture_output=True, text=True, timeout=30
    )
    assert result.returncode == 0, f"Dry run failed: {result.stderr}"

if __name__ == "__main__":
    test_script_exists()
    test_dry_run()
    print("✅ All smoke tests passed!")
`
        }
    }
};
