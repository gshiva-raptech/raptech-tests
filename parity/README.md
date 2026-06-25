# Raptech parity testing + fixer-handoff

Two Claude sessions, clean split of duties:

- **Testing session** (read-only on code): drives the apps, finds gaps, writes findings. Never edits Java.
- **Fixing session** (legacy source + migrated edit rights): picks up findings, fixes to legacy parity, leaves changes uncommitted for the human.

Findings are passed as files under [`findings/`](findings/) — a local version of the old Google-Sheet tracker.

---

## The model

Raptech is **one SaaS codebase**: one legacy app, one migrated app (Java 8→22 conversion already done — not redone). It runs as separate **production instances that differ only in data**:

- 🇮🇳 **india** — hosted in India
- 🌐 **international** — hosted in US
- 🧪 **local-dev** — migrated on `localhost:8080`, legacy = staging reference (what we run today)

The same cases run against any instance; only URLs + credentials change. All defined in [`instances.json`](instances.json). Credentials live in the repo-root `.env` (gitignored) — `instances.json` only names the env vars.

## Two test tracks

- **Track A — legacy ↔ migrated parity** (`cases/legacy-vs-migrated/`): create a record in legacy, do the same in migrated, compare outcomes. Any mismatch auto-writes a finding.
- **Track B — new migrated customer** (`cases/new-instance/`): set up a brand-new customer in migrated and test use cases *within migrated only* (net-new, nothing to compare against — judged vs expected values in the case).

## Run a case

```bash
# from the raptech-tests repo root
node parity/run-case.mjs --case TC-ORG-001 --instance local-dev
node parity/run-case.mjs --case TC-ORG-001 --instance local-dev --headed --keep
node parity/run-case.mjs --case TC-NEW-001 --instance local-dev          # Track B
```

Exit code 0 = parity holds; 1 = mismatch (a finding is written under `findings/`).

Flags: `--headed` (visible browser), `--keep` (keep screenshots under `parity/.runs/`), `--no-findings` (don't write a finding on mismatch).

## Workflow loop

1. Testing session runs cases → on mismatch, a `findings/F-xxxx-*/` folder appears (`ERROR.md` + `INSTRUCTIONS.md` + `screenshots/`) and a row is added to [`findings/INDEX.md`](findings/INDEX.md).
2. Hand `F-xxxx/INSTRUCTIONS.md` to the **fixing session** (it reads [`FIXER_BRIEF.md`](FIXER_BRIEF.md) first).
3. Fixer fixes to legacy parity, updates the INDEX row to **Fixed**, leaves code uncommitted.
4. Human builds + tests + commits. Testing session re-runs the case to confirm parity.

## Files

| Path | What |
|---|---|
| `instances.json` | instances (URLs + which `.env` vars hold creds) |
| `run-case.mjs` | the runner (`--case --instance`) |
| `lib/` | shared helpers: `config`, `forms` (app drivers), `findings` (handoff writer) |
| `cases/` | test cases (Track A + Track B); see `cases/README.md` |
| `test-data/` | static datasets per case (no credentials) |
| `findings/` | fixer handoff hub + `INDEX.md` status board |
| `FIXER_BRIEF.md` | standing rules for the fixing session |
