---
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
