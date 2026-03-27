# CLAUDE Hand-off — FieldOps

Date: 2026-03-27T12:24:38Z
Prepared for: Claude code
Prepared by: FieldOps Copilot agent

Purpose

This document hands off the current state of the FieldOps repo and the recent changes so Claude can continue testing, debugging, or implementing the next steps. It explains what changed, how to test locally, where to look in the code, and recommended next tasks.

Summary of recent changes

- UI: Manual ActionType mapping
  - New Settings card to add/remove manual mappings (ActionType ID → display name), persisted in localStorage as part of `fo_config` (S.config.actionTypeMap).
  - UI IDs: `set-actiontype-mapping-id`, `set-actiontype-mapping-name`, `btn-add-actiontype-mapping`, `set-actiontype-mappings`.
- Diagnostics/Test: Test Action Type POST flow (Danger)
  - Settings card to run a real POST to `/Actions` for a specified ticket and action type for triage.
  - UI IDs: `test-ticket-id`, `test-actiontype-id`, `test-action-outcome`, `btn-load-actiontypes-test`, `btn-run-test-action`, `test-action-result`.
  - Test POST sends a single Action with `timetaken=1`, `billable=false` and a clear note.
- Auth: OAuth scope configurable
  - Settings field `set-scope` persists `cfg.scope` and `startAuth()` uses `cfg.scope || 'all'`.
  - Helps request `offline_access` or other needed scopes.
- Docs/marketing: Added hero SVG and README/ABOUT updates and updated `.github/copilot-instructions.md` with troubleshooting notes.

Files changed/added (high-level)

- index.html — primary application; all logic, UI and styles live here. Main changes: manual mapping UI + helpers, test action POST flow, OAuth scope handling.
- README.md — updated hero blurb and metadata.
- ABOUT.md — marketing copy.
- .github/copilot-instructions.md — expanded troubleshooting notes and marketplace guidance.
- landing-fieldops/hero.svg — hero image used in README.

Key runtime concepts and where to look

- Single-file PWA
  - index.html contains the full app. Global state is `S`, storage keys are in `SK`.
- Storage
  - localStorage key: `fo_config` — JSON with shape: { tenant, authServer, resourceServer, clientId, redirectUri, scope, ticketFilter, agentId, actionTypeId, actionOutcomeId, actionTypeMap }.
  - sessionStorage key: `fo_auth` — token object: { access_token, refresh_token, expires_at, agent_id, agent_name }.
- Important functions (index.html)
  - fetchActionTypes() — probes many candidate endpoints and also inspects swagger/openapi to find list endpoints.
  - fetchPermittedActionTypes(ticketId) — probes per-ticket endpoints and heuristically filters allowed items.
  - fetchOutcomes(), populateOutcomeSelect(prefix, list) — load Outcome lists used for Actions requiring outcomes.
  - populateActionTypeSelect(prefix, list) — now merges manual mappings from S.config.actionTypeMap.
  - postTimeEntry(entry) — posts to `/Actions` with a JSON array body: [{ ticket_id, timetaken, startdatetime, note, billable, actiontype_id, outcome_id? }].
  - testActionTypePost() — the test POST flow added for diagnostics.
  - S.actionTypeDiscoveryAttempts — runtime array capturing attempted endpoints and results for diagnostics.

How to run & test locally (recommended)

1. Serve the repo locally (or use the deployed preview):
   - Quick: `npx serve .` and open `http://localhost:5000` (or double-click index.html).
2. Settings → Connection: populate `Auth Server URL`, `Resource Server URL`, `Client ID`, `Redirect URI`. Set `OAuth scope(s)` to include `offline_access` if you need refresh tokens (recommended: `offline_access all`). Save Settings.
3. Sign in (PKCE): click Sign In and follow the provider flow. With admin perms now granted to the FieldOps app, discovery should have better results.
4. Settings → Load action types (global) or Load outcomes; if API discovery fails, use Manual Action Type mappings to add an ID and friendly name.
5. For diagnostic POSTs: use Test Action Type card. Use a staging ticket if possible. Click Run test POST and inspect `test-action-result` box for raw response.
6. End-to-end: Start a job, use Finish & Log to Post Time Entry. If permission errors occur for a specific Action Type, change the configured Action Type ID or add a manual mapping and retry.

Debugging & troubleshooting tips

- If discovery returns many 404s (per-ticket endpoints), check `S.actionTypeDiscoveryAttempts` in the browser console to see attempted endpoints and server responses.
  - In console: `console.log(S.actionTypeDiscoveryAttempts)` or inspect Settings → Diagnostics if present.
- If refresh tokens are not returned, confirm the requested scopes include `offline_access` (use Settings → OAuth scope(s) to add it), then reauthenticate.
- If permission errors remain (e.g., "You do not have access to this Action"), confirm the app's role/permissions in the Halo admin portal and that your API user has read access for ActionTypes/per-ticket endpoints.
- Use vendor swagger (`agents/integrations/halopsa/vendor-reference/swagger-v2.json`) for endpoint discovery. It documents `/Actions` and `/Outcome` but does not guarantee an ActionTypes listing endpoint for all instances.

Notes about safety & side effects

- Test Action Type POST creates real Actions. `timetaken=1` and `billable=false` are used to minimize impact, but prefer a staging ticket.
- Manual mappings are stored in localStorage only (per browser). No server-side storage.

Deployment

- Deploy with Vercel (repo already linked): `npx vercel --prod` or `npx vercel` for preview deployments.
- Do not commit secrets. Tokens are stored in sessionStorage for runtime and (optionally) in pass for CI use — do not check them into git.

Recommended next tasks for Claude

1. Run end-to-end tests now that admin permission is granted — exercise Load Action Types (global) and the Test Action Type POST on a staging ticket; collect S.actionTypeDiscoveryAttempts.
2. If per-ticket endpoints still 404, implement a small import-from-swagger feature to pre-populate manual mappings from vendor swagger paths (or add a one-time `importMappingsFromSwagger()` helper).
3. Consider changing the default requested scope to include `offline_access` (or document recommended scope strings). Optionally add a checkbox in UI to request refresh tokens explicitly.
4. Add a cleanup API helper to delete test Actions (if Halo supports it) or add a flag to mark tests as ephemeral.

Contacts & references

- Live preview (alias used during development): https://fieldops-delta.vercel.app
- Vendor swagger used: `/home/thomas/agents/integrations/halopsa/vendor-reference/swagger-v2.json`
- Key repo files: `index.html`, `README.md`, `.github/copilot-instructions.md`, `landing-fieldops/hero.svg`

If anything is unclear, Claude should open `index.html` and inspect functions listed above. The `S` runtime object is the fastest way to inspect runtime state and discovery diagnostics.

---

End of handoff.
