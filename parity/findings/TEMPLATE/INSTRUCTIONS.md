# Fix request — F-XXXX: <short title>

> For the FIXING Claude session. Read `parity/FIXER_BRIEF.md` first.

## The gap
- **Expected (legacy):** <...>
- **Actual (migrated):** <...>
- See `ERROR.md` for evidence + screenshots.

## Where to look
- <legacy screen for the URL path>
- <likely migrated controller / template / service / entity>

## Definition of done
- Migrated matches legacy for this case.
- Re-run passes: `node parity/run-case.mjs --case TC-XXX-000 --instance local-dev`
- Update this finding's row in `parity/findings/INDEX.md` → **Fixed** + one-line note.
- Log root cause + files in the migrated repo's `summary.md`.
- Do **NOT** `git commit` — leave for the human.
