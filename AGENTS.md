# FieldOps agent guidance

FieldOps is a single-file, offline-capable HaloPSA field-technician PWA. UI, JavaScript, and CSS live in `index.html`; manifest/icons and `_redirects` support installation and routing. Keep changes focused without adding a build pipeline unless the task requires one.

## Development and verification

Install locked dependencies with `npm ci`, install Chromium using `npx playwright install --with-deps chromium`, and run `npm test`; these are the CI steps. `npm run serve` starts the repository static server. Tests live in `tests/`, with `playwright.config.js` controlling browser execution. Verify the affected timer, offline state, sign-in, attachment, or ticket-posting workflow at the relevant seam; never use live Halo writes as a routine test fixture.

## Behavior and release boundaries

Preserve OAuth PKCE and runtime token handling, offline work, timer phase/duration guards, photo size limits, and Halo's Action-array payload shape. Action Type/Outcome discovery can fail or be restricted; retain explicit configuration and useful diagnostics instead of assuming tenant IDs or granting permissions. Never embed client secrets or commit tokens, tenant data, or captured photos.

CI deploys to Cloudflare Pages only after tests pass on a push to `main`. [README.md](README.md) still mentions Vercel; use `.github/workflows/ci.yml` as the checked-in deployment contract and verify the intended environment before any release. Bump `APP_VERSION` in `index.html` for a meaningful release as required by [CLAUDE.md](CLAUDE.md). Preserve `_redirects` SPA behavior. Manual deployment/project creation and production time/ticket posts need explicit task scope and post-action verification.
