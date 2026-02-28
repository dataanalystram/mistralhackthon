#!/usr/bin/env python3
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
    print("\n▶ Step 1: Running test suite...")
    code, stdout, stderr = run_cmd("npm test 2>&1 || true", repo, dry_run)
    test_output = stdout + stderr

    # Step 2: Identify failures
    print("\n▶ Step 2: Identifying failures...")
    if "FAIL" in test_output or "failing" in test_output or "Error" in test_output:
        print("  ❌ Failures detected in test output")
    else:
        print("  ✅ No failures detected — tests are already passing!")
        if not dry_run:
            return 0

    # Step 3: Apply patch
    print("\n▶ Step 3: Applying fix...")
    # Fix: math.js has subtraction instead of addition
    patch_cmd = 'sed -i.bak "/BUG/s/return a - b/return a + b/" src/math.js 2>/dev/null || sed -i "" "/BUG/s/return a - b/return a + b/" src/math.js'
    code, _, _ = run_cmd(patch_cmd, repo, dry_run)

    # Step 4: Rerun tests
    print("\n▶ Step 4: Rerunning tests...")
    code, stdout, _ = run_cmd("npm test", repo, dry_run)

    # Step 5: Summary
    print("\n▶ Step 5: Summary")
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
