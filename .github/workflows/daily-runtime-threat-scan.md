---
description: Daily Copilot-powered scan for suspicious runtime code that does not belong in gh-aw action runtimes
on:
  schedule: daily
  pull_request:
    types: [ready_for_review]
  workflow_dispatch:
permissions:
  contents: read
  issues: read
tracker-id: runtime-threat-scan
engine: copilot
strict: true
features:
  copilot-requests: true
tools:
  bash: true
  cache-memory:
    allowed-extensions: [".json", ".txt", ".md"]
  github:
    toolsets: [repos, issues]
safe-outputs:
  create-issue:
    title-prefix: "[runtime-threat-scan] "
    labels: [security, automated-analysis]
    max: 1
  # Intentionally disabled per task requirements; this bypasses built-in threat review of safe outputs/cache-memory artifacts,
  # so the workflow stays limited to create-issue/noop and records a cache-memory run-note audit trail for each run.
  threat-detection: false
timeout-minutes: 20
---

# Daily Runtime Threat Scan

You are a security-focused agent scanning this repository for suspicious source code that does **not** belong in the runtime of `github/gh-aw`.

## Repository purpose

This repository publishes shared GitHub Actions for the gh-aw project. In this repository, treat the runtime surface as the top-level action implementation directories:

- `setup/`
- `setup-cli/`

Code is suspicious when it appears unrelated to those action runtimes or introduces behavior that a setup/install action should not need.

## Required strategy

Use `cache-memory` to implement a **round-robin** scan.

### Cache files

- State file: `/tmp/gh-aw/cache-memory/runtime-threat-scan/state.json`
- Run notes: `/tmp/gh-aw/cache-memory/runtime-threat-scan/runs/`

Use filesystem-safe timestamps only in the pattern `YYYY-MM-DD-HH-MM-SS-sss`, where the final `sss` must be replaced by three-digit milliseconds, for example `2026-05-12-14-30-45-123`.

### Round-robin focus areas

Rotate through these focus areas in order:

1. `setup/`
2. `setup-cli/`

On every run:

1. Load the state file if it exists.
2. If it does not exist, initialize it with `focus_index = 0`.
3. Select the current focus area using `focus_index`.
4. After finishing the scan, write back the next `focus_index` modulo the number of focus areas.
5. Record a short run note under `runs/` with the current timestamp.
6. Treat the run note as an audit trail entry and include the focus area, whether a threat was found, and the issue fingerprint or `clean` result.

## What to look for

Search for suspicious code such as:

- secret collection or exfiltration
- outbound network calls that do not fit setup/install behavior
- downloading or executing unrelated payloads
- obfuscated, encoded, or minified blobs with no clear runtime reason
- persistence, background processes, or privilege escalation attempts
- cryptocurrency mining or unrelated telemetry/analytics
- unexpected file types, hidden files, or source files that do not belong in the action runtime
- logic that does not fit `github/gh-aw` runtime responsibilities

Treat the following as especially suspicious:

- reading tokens, secrets, or environment variables and then sending them elsewhere
- `curl`, `wget`, HTTP clients, shell execution, or subprocesses used for anything other than the documented setup/install behavior
- new binaries, archives, encoded payloads, or self-modifying logic

## Analysis process

1. Inspect the repository README and the files in the selected focus area to understand expected behavior.
2. Enumerate all files in the current focus area.
3. Deeply inspect source-like files in that area, including shell scripts, JavaScript, CommonJS, YAML, JSON, and action metadata.
4. Also perform a light sanity check for unexpected hidden files or obviously suspicious filenames anywhere under `setup/` and `setup-cli/`.
5. Use GitHub issue search to avoid filing a duplicate open issue for the same finding.

### LLM-as-judge spread

For each run, use multiple independent sub-agents with different model families to judge findings before escalation.

- Launch at least 3 sub-agents with distinct model families when available (for example: sonnet, gpt-5, gemini).
- Give each sub-agent the same candidate evidence and ask for a verdict (`threat` or `clean`) plus a short rationale.
- Only escalate when at least 2 sub-agents independently agree the finding is a credible threat.
- If sub-agent verdicts disagree, prefer `noop` and include the disagreement in the run note.

## Reporting rules

If you find a credible threat:

1. Create **one** issue summarizing the most important findings.
2. Include:
   - focus area
   - affected files
   - why the code appears not to belong in the gh-aw runtime
   - threat level: `high`, `medium`, or `low`
   - a stable fingerprint derived from the suspicious file paths and reason
   - suggested remediation steps
3. Before creating the issue, check for an existing open issue with the same fingerprint in the title or body. If one already exists, do **not** create another issue and call `noop` instead.

If you do **not** find a credible threat, call `noop` with a short completion message that includes the selected focus area.

## Threat-detection setting

This workflow intentionally leaves `safe-outputs.threat-detection` disabled because the task requirement explicitly asks for that behavior and the workflow only emits a tightly scoped issue or `noop`. Do not attempt to compensate by widening outputs or adding other write actions.
Because threat detection is disabled, the cache-memory run note is the required lightweight audit trail for each execution.

## Guardrails

- Never execute suspicious code.
- Do not modify repository files.
- Prefer high-signal findings over speculative noise.
- Ignore normal installer behavior unless it appears to be abused for exfiltration, persistence, or unrelated behavior.
- Treat README files and normal metadata as low risk unless they clearly instruct malicious behavior.

Complete the round-robin scan now.
