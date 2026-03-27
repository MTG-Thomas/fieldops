# Contributing to FieldOps

Thanks for your interest in contributing. FieldOps is a single-file PWA — no build step required.

## Setup

```bash
git clone https://github.com/mtg-thomas/fieldops.git
cd fieldops
npm install
npx playwright install chromium
```

## Running tests

```bash
npm test              # headless (CI mode)
npm run test:headed   # watch tests run in a real browser
npm run test:ui       # Playwright interactive UI
```

Tests mock all HaloPSA API calls — no real credentials needed.

## Serving locally

```bash
npm run serve         # http://localhost:5000
```

For end-to-end testing against real HaloPSA, use the production URL
(`fieldops-delta.vercel.app`) — the OAuth redirect URI is registered there only.

## Code conventions

All app code lives in `index.html`. Key rules from the architecture:

- **Always use `esc()`** for any API or user-supplied data rendered into `innerHTML`
- Add new state to `S`, new storage keys to `SK`
- Follow the `buildXHTML / bindXEvents / renderX` pattern for UI sections
- Use `apiRequest()` for all HaloPSA calls — never `fetch()` directly
- Use CSS custom properties (`--accent`, `--bg`, etc.) for all colors
- Touch targets must be `min-height: 44px`

See `.github/copilot-instructions.md` for the full architecture reference.

## Submitting changes

1. Fork the repo and create a branch
2. Make your changes in `index.html`
3. Add or update tests in `tests/app.spec.js`
4. Run `npm test` — all tests must pass
5. Open a PR using the template

## Deployment

Only maintainers deploy to production:

```bash
npx vercel deploy --prod --yes
```
