# Raptech UI Tests (Playwright)

UI automation for the **migrated Raptech** app — Item Master. This project is fully
separate from the migrated source and does not modify it. Nothing here is committed.

App under test: `http://localhost:8080` (the Raptech Spring Boot app runs **on this
same VM**; `34.68.176.65` is the VM's own external IP, which it can't reach via NAT —
always use `localhost`).

## Setup (one time)

```bash
cd /home/gshiva/raptech-tests
npm install
npx playwright install chromium      # browser binary
sudo npx playwright install-deps chromium   # OS libs (libgbm etc.)
cp .env.example .env                 # then set RAPTECH_USER / RAPTECH_PASSWORD
```

### Start the app under test (must be running before `npm test`)

```bash
cd /home/gshiva/raptech_v_1-0
set -a; source ~/.raptech-dev.env; set +a          # DB creds + Postgres tunnel env
java -jar raptech-app/target/raptech-app.jar        # cold start ~45-60s
# health: curl -s localhost:8080/actuator/health  ->  {"status":"UP"}
```
The Postgres SSH tunnel (`localhost:5432 -> 168.144.123.243`) must be up; the app
won't start without the DB.

## Run

```bash
npm test                  # all tests, headless
npm run test:item-master  # just Item Master
npm run test:headed       # watch it run in a browser
npm run report            # open the HTML report after a run
```

Debug a selector against the live app:

```bash
BASE_URL=http://localhost:8080 npm run codegen
```

## What it validates

1. Login with test credentials (`.env`) via Spring Security `/signIn`.
2. Open the New Item form (`/items/new`).
3. **HSN is hidden until an Entity is selected** (and appears after).
4. **Scrap Item opens a search popup** (modal `#scrapItemModal`), not a plain dropdown.
5. Create an item — parameterized over **all 15 item types**. Each needs only the
   four core fields (Entity, Item No, Description, UOM); success = redirect to
   `/items/{id}`.

> Note: changing **Item Type** reloads the form and clears the Entity, so the
> create flow selects Item Type first, then Entity, then the core fields.

## Artifacts

- **Screenshot on failure** — auto-captured (`screenshot: 'only-on-failure'`).
- Video + trace retained on failure. View with `npm run report`.
- All artifacts land in `test-results/` and `playwright-report/`.

## Where things live

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Runner config, baseURL, on-failure artifacts |
| `tests/support/selectors.ts` | **All selectors in one place** — fix here when a locator misses |
| `tests/support/login.page.ts` | Login flow |
| `tests/support/item-master.page.ts` | Item Master page object + the two behavior checks |
| `tests/item-master.spec.ts` | The tests |
| `test-data/item-master.ts` | Entity, UOM, the 15 item types |

> Selectors are **confirmed against the live DOM** (2026-06-21), not guesses. The
> full suite (16 tests) passes against the locally-running app.

## Parity testing vs. the legacy app (planned)

Goal: prove the **legacy Struts/Java 8 app** was migrated faithfully into the new
**Spring Boot/Java 22** app. The legacy app is the *oracle* (golden master): for each
use case we drive the legacy app, record what it actually does, then run the same
scenario against the migrated app and compare. Where the migration intentionally
**fixed or improved** a legacy behavior, that difference is *expected* and is recorded
as an exception so it stops flagging.

### Decisions

- **Databases:** legacy and migrated use **separate DBs** — no record collision.
  Test records are still tagged with a unique run marker for easy identification and
  cleanup on each side.
- **Capture:** Claude **auto-drives the legacy app with Playwright** (legacy Struts
  JSP selectors, confirmed against the live legacy DOM). Each run records inputs,
  every validation/error message, field-visibility changes, network calls, and the
  resulting saved record (+ screenshots/trace).
- **Comparison is semantic, not DOM-level.** Struts JSP and Spring Boot produce
  different HTML/selectors — that is expected and never counts as a difference on its
  own. We compare: same inputs → same errors, same field-visibility logic, same
  persisted result, same end state.
- **On difference:** emit a side-by-side **triage report** (`MATCH` / `DIFFERENCE`),
  not a hard pass/fail. The user labels each difference `regression` vs
  `intended improvement`; labeled improvements become saved exceptions
  (`parity-exceptions.ts`) and stop flagging on later runs.

### Per-scenario flow

1. Drive **legacy**, perform the scenario, capture a *behavior record*.
2. Turn the record into a **behavior spec** (assertions).
3. Run the same spec against the **migrated** app.
4. Emit a side-by-side diff → user triages anything that differs.

### Planned structure

```
tests/
  parity/
    <scenario>.parity.spec.ts     # one logical test, runs both sides
  support/
    legacy/                       # legacy page objects + selectors (Struts JSP)
    migrated/                     # reuse existing item-master.page.ts etc.
    behavior-record.ts            # captured-behavior shape + comparison
    parity-exceptions.ts          # triaged "intended improvement" list
parity-report/                    # generated side-by-side diffs
```

### To start (still needed)

1. **Legacy app URL** (confirm reachable from this VM — `localhost` or SSH tunnel).
2. **Legacy login credentials** — kept in `.env` (`LEGACY_BASE_URL`, `LEGACY_USER`,
   `LEGACY_PASSWORD`); nothing committed.
3. **First use case** to validate end-to-end (e.g. HSN-hidden-until-Entity, Scrap Item
   popup, or item creation) before scaling to all 15 item types.
