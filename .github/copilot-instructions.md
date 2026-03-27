# Copilot instructions for fieldops

## Deploying / verifying changes

- No build step — the app is a single static file.
- To deploy: `vercel --prod` (project is already linked via `.vercel/project.json`).
- To verify locally: serve `index.html` from any static server (e.g. `npx serve .`) and open the page.
- There are no automated tests or lint scripts in this repo.
- Bump `APP_VERSION` in `index.html` manually when releasing a meaningful change.

## High-level architecture

- `index.html` is the entire application: all markup, styles (`<style>`), and logic (`<script>`) live in one ~2600-line file.
- The app is a HaloPSA field-tech PWA. The three top-level flows are: first-run configuration → PKCE sign-in → main ticket/job workspace.
- All runtime state lives in the `S` object; all storage keys are in the `SK` constant — never use ad-hoc key strings.
- Persistence is split by concern:
  - `localStorage` — config, active job, today's activity log (auto-resets at midnight in `loadTodayLog()`).
  - `sessionStorage` — auth tokens (`fo_auth`) and PKCE code verifier (`fo_pkce_v`).
- The UI is composed of named screens (`screen-config`, `screen-auth`, `screen-app`), tab panes (`tab-dashboard`, `tab-activity`, `tab-settings`), a full-screen ticket detail overlay, and a bottom sheet for finish/log.
- Every API call goes through `apiRequest(path, options)`, which calls `ensureValidToken()` first and handles 401 by clearing auth and returning to the sign-in screen.
- Token proactive refresh runs on an interval (`TOKEN_CHECK_INTERVAL_MS = 60s`) with a 5-minute expiry buffer (`TOKEN_REFRESH_BUFFER_MS`).
- Ticket details (client, site) are fetched lazily and memoized in `S.clientCache` / `S.siteCache` for the session.
- The active job is a state machine: `none → ready → traveling → arrived → onsite → done`. `jobPhase()` derives the current phase from timestamps in `S.activeJob`.
- GPS watch is active only while the ticket detail overlay is open; `stopGPS()` is called when closing it.
- Photos are in-memory only (`S.photos`) and are not persisted between page loads.

## Key conventions

**Safety — always use `esc()` for dynamic HTML**
- Every piece of API or user-supplied data rendered into `innerHTML` must be wrapped in `esc()`. This includes ticket fields, client/site names, URLs in `href` attributes, etc.
- Never bypass `esc()` for user-visible strings even if they look safe; the function handles `&`, `<`, `>`, `"`, and `'`.

**State and storage**
- Add new state to `S` and new storage keys to `SK`; don't introduce standalone globals or new `localStorage` keys outside `SK`.
- `saveActiveJob()`, `saveConfig()`, `saveAuth()`, `saveTodayLog()` are the only places state is written to storage — keep writes centralized through these helpers.

**Dynamic UI sections — build / bind pattern**
- When rendering a section that needs event listeners, follow the existing three-function pattern: a `buildXHTML()` pure function returns an HTML string, a `bindXEvents()` attaches listeners after insertion, and a `renderX()` coordinates both. See `renderDetailBody` / `buildDetailHTML` / `bindDetailEvents` as the canonical example.
- Rebind events after any `innerHTML` replacement; listeners on replaced nodes are lost.

**Styles — CSS custom properties and fonts**
- Use the CSS custom properties defined in `:root` for all colors: `--bg`, `--surface`, `--border`, `--accent` (`#00d4ff`), `--success`, `--warning`, `--danger`, `--muted`, `--text`.
- Three fonts with distinct roles: `--font-heading` (Syne — bold titles), `--font-mono` (DM Mono — IDs, times, data), `--font-body` (Inter — everything else).
- Respect `min-height: 44px` on interactive touch targets.
- Safe-area insets are handled via `var(--safe-b)` (`env(safe-area-inset-bottom)`); use this in any fixed-bottom element.

**Desktop phone-frame quirk**
- At `≥600px`, `#app` is centered using `transform: translate(-50%, -50%)`. This causes all `position: fixed` descendants to be contained within `#app` rather than the viewport. No compensating CSS is needed on child elements — but be aware when adding new fixed overlays.

**Config forms**
- The config screen (`cfg-*` IDs) and settings tab (`set-*` IDs) share the same underlying fields. `collectConfigForm(prefix)` reads either by passing `'cfg'` or `'set'`. Keep both sets of IDs in sync when adding a new config field.

**Routing**
- `vercel.json` rewrites all non-file paths to `/`, so the app handles its own routing client-side. Don't rely on server-side path routing.

## Repo-specific notes

- `CLAUDE.md` contains Vercel-specific guidance (stateless functions, env vars for secrets, no deprecated KV/Postgres). Apply it when adding any server-side functionality.
- `manifest.json` defines the PWA launcher metadata (name, theme color `#0f1923`, icon). Update it if the app name or theme changes.

## Marketing / marketplace listing

When creating marketplace or listing text, use the short blurb and meta description in README.md. Suggested copy is embedded in the README at the top (hero image + short blurb). Keep the one-line meta description ≤160 characters for search engines and marketplace cards.

## Action Type discovery & troubleshooting

- The app records detailed discovery attempts in the runtime state key `S.actionTypeDiscoveryAttempts`. Use Settings → Diagnostics to review which endpoints were probed and their responses.
- Common failure modes:
  - The HaloPSA instance does not expose a global `/ActionTypes` endpoint (vendor swagger may omit it).
  - Per-ticket endpoints such as `/Tickets/{id}/ActionTypes` often return 404/403 when the API agent lacks permission.
  - Field and casing differences (ActionTypeId vs actiontype_id) require normalization — the client already attempts common variants.

- Admin checklist when discovery fails:
  1. Confirm whether a listing endpoint exists on the instance (ask HaloPSA admin or inspect the instance swagger/openapi JSON). If present, enable read permission for the API user.
  2. If no listing endpoint is available or permission cannot be granted, use the Settings → ActionType mapping UI to add manual mappings from ActionType ID → display name.
  3. Optionally use the Test Action Type flow to attempt a safe POST and observe server errors; diagnostics surface the raw response for triage.

- When filing issues, attach the vendor swagger (openapi.json / swagger.json) and a copy of `S.actionTypeDiscoveryAttempts` from the UI — these make triage much faster.

