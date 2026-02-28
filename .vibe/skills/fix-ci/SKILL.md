---
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
1. **Run tests** — Execute `npm test` and capture output
2. **Identify failure** — Parse test output for failing tests and error messages
3. **Apply patch** — Fix the identified bug in source code
4. **Rerun tests** — Verify the fix resolves all failures
5. **Summarize** — Report root cause and fix applied

## Safety
- Only modifies source files in the project root
- Requires confirmation before applying patches
- No network access required
- No secrets accessed
