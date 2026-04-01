## Deploying / verifying changes

- No build step — the app is a single static file.
- **Deployment is automatic**: merging to `main` triggers the CI workflow, which runs Playwright tests then deploys to Cloudflare Pages.
- To deploy manually: `npx wrangler pages deploy . --project-name=fieldops`
- To verify locally: serve `index.html` from any static server (e.g. `npx serve .`) and open the page.
- There are no automated tests or lint scripts in this repo beyond the Playwright suite.
- Bump `APP_VERSION` in `index.html` manually when releasing a meaningful change.

### Cloudflare Pages setup (one-time)
- Create a project: `npx wrangler pages project create fieldops`
- Store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub repo secrets.
- SPA routing is handled by `_redirects` at the repo root.
