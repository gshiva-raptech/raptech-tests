# F-0011 — Data Migration cache is per-JVM (Caffeine), legacy was shared (Redis)

**Type:** architectural parity / decision-needed (NOT a single-node bug)
**Severity:** low for single-node deploys; **medium** if any region runs >1 app node behind a load balancer
**Case:** TC-DM-001 (all green — the cache contract itself works correctly)
**Status:** ACCEPTED / CLOSED (2026-06-24) — topology confirmed below.

## Resolution (2026-06-24)
Product owner confirmed the topology: **separate, independent servers per region** (India /
International) in different data centers, different hosting, **no link between them** — i.e. each region
is a **single app instance against its own DB**. That is exactly the topology where the per-JVM Caffeine
cache is correct: each region has its own cache (regions should never share reference-data caches), and
within a region the single node's Data Migration / `@CacheEvict` evict the only JVM. **No fix needed.**
**Reopen only if** a region is ever scaled to multiple app nodes behind a load balancer — then make
eviction cluster-wide (Redis-backed cache, or broadcast evictions via pub/sub; see options below).

Minor leftover (optional, cosmetic): stale comment in `OrgSettingsController` (~652–656) still says
"there is genuinely no cache" — predates the cache commit; behaviour is correct, only the comment is
wrong. Safe one-line cleanup whenever that file is next touched.

## What was verified (works correctly)
TC-DM-001 proves the migrated "Data Migration" feature behaves correctly **on a single node**:
- Reference lookups (countries/states/currencies/GL/UOM/item-category/function) are genuinely
  cached — after a *backend DB insert* (bypassing the app) the org-create Country dropdown still
  did NOT show the new row → it was served from cache, not the DB.
- Running **Data Migration → Country** (`COUNTRY_STATE`) evicted the `countries` cache and the new
  row appeared. Message: "Reference data refreshed."
- Non-cached types (Suppliers / Supplier Planning) correctly report a read-live no-op
  ("This data is read live — already current.").
- App-side edits to the **editable** masters evict correctly:
  `@CacheEvict` on UOM (create/edit/delete/import), Item Category (×3), Function (×2).
  The **seed** masters (Country/Currency/GL) have no app edit path — they only change via backend
  DB load, which Data Migration covers. A 30-min `expireAfterWrite` TTL self-heals anything missed.

So functionally this is **equivalent to (arguably cleaner than) legacy** for a single app instance.

## The parity gap
Legacy used **Redis** — a *shared, external* cache. One "Data Migration" run (or any write) was
visible to **every** app node pointing at that Redis.

Migrated uses **Caffeine** — an *in-process, per-JVM* cache (`CacheConfig`, raptech-app).
`cache.clear()` / `@CacheEvict` only affect **the node that handled the request**. In a multi-node
deployment:
- A backend bulk-load + "Data Migration" on node A refreshes **node A only**; nodes B/C keep serving
  stale reference data until their own 30-min TTL expires (or they happen to handle a Data Migration
  POST themselves).
- Same for app-side `@CacheEvict` edits: only the editing node is immediately consistent.

The product runs two production regions (India / International). **If each region is a single app
node, this is a non-issue.** If any region is load-balanced across multiple app instances, reference
data can be inconsistent across nodes for up to the TTL window after a backend load.

## Decision needed (pick one)
1. **Single-node per region → accept as-is** (record as an exception). Simplest; current behavior is
   correct for that topology. Optionally shorten the TTL.
2. **Multi-node → make eviction cluster-wide.** Options: (a) back the Spring cache with Redis again
   (closest to legacy; one evict = global), or (b) broadcast evictions (e.g. Redis pub/sub / message
   bus) so Data Migration + `@CacheEvict` fan out to all nodes.

## Minor (same area)
`OrgSettingsController` (org-user Data Migration variant) still carries a **stale comment**
(lines ~652–656): *"there is genuinely no cache … a refresh is always already in effect."* That
predates the cache commit — the POST handler right below it (~701–704) **does** evict the Caffeine
cache. Behaviour is correct; only the comment is wrong. Update the comment to match `AdminMiscController`.

## Repro
`node parity/run-case.mjs --case TC-DM-001 --instance local-dev`
