#!/usr/bin/env python3
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
