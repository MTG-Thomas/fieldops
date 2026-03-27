# FieldOps

FieldOps is a lightweight, offline-capable Progressive Web App (PWA) that complements HaloPSA by giving field technicians a fast, focused UI for job check-ins, timers, time posting, photo capture, and ticket notes. It’s designed for service providers and MSPs that rely on mobile field work and want a friction-free companion to HaloPSA.

Key benefits
- Fast single-file PWA: deploy the static site and go — no build step required.
- Time posting to HaloPSA Actions: posts Actions as arrays to /Actions with optional Outcome support.
- Flexible Action Type handling: auto-discover when the server exposes endpoints or manually configure ActionType IDs.
- Offline-friendly UX: local state and simple workflows for intermittent connectivity.
- Minimal footprint: a single `index.html` contains UI, JS, and CSS for easy auditing and customization.

Features
- Ticket list and detail view with quick "Post to Halo" time entry
- Job timer with travel/onsite phases and minimal duration guards
- Photo capture with size guards for attachments
- OAuth PKCE-based sign-in to HaloPSA
- Settings UI to configure tenant, API URLs, agent ID, default Action Type/Outcome
- Diagnostics and discovery helpers for Action Types and Outcomes

Quick start (developer)
1. Clone the repo:
   ```bash
   git clone https://github.com/MTG-Thomas/fieldops.git
   cd fieldops
   ```
2. Serve locally (static server):
   ```bash
   python3 -m http.server 8000
   # then open http://localhost:8000/index.html
   ```
   or use `npx serve`, `http-server`, etc.
3. Deploy to Vercel (recommended):
   ```bash
   npx vercel --prod
   ```
   (Set `VERCEL_TOKEN` in your environment or use interactive login.)

Configuration (first run)
- Open the app and fill Settings:
  - Tenant (HaloPSA subdomain)
  - Auth Server URL (e.g. `https://yourtenant.halopsa.com/auth`)
  - Resource Server (API) URL (e.g. `https://yourtenant.halopsa.com/api`)
  - Client ID (from your Halo OAuth app)
  - Redirect URI (the app origin; must be registered in the OAuth app)
  - Agent ID (your Halo agent id)
  - Default Action Type ID (optional) and Default Outcome ID (optional)
- Save & Connect → Sign in with HaloPSA

Notes on Action Types
- HaloPSA installations vary. Some expose an ActionTypes listing endpoint; others do not or restrict it to privileged roles.
- If discovery fails, use Settings → Load action types to attempt detection. The app stores discovery attempts and shows diagnostics to help admins.
- If no listing endpoint is available, configure a Default Action Type manually in Settings or maintain a mapping.

Troubleshooting
- "You do not have access to this Action": typically a permissions issue for the API agent or an invalid `actionType_id`. Check Settings → Load action types and diagnostics; ask your Halo admin to grant the API agent permission or provide a valid Action Type ID.
- "An Outcome must be entered for this Action": configure Default Outcome in Settings or use the Outcomes picker (Settings → Load outcomes).

Contributing
- This is a single-file PWA (`index.html`). Keep changes focused and small. Run the app locally to test UI changes.
- Open issues for feature requests or bugs. PRs are welcome; keep changes scoped and include testing steps.

Security and privacy
- Do not commit secrets (client secrets, tokens). Use environment variables, Vercel secrets, or a password store (e.g., `pass`).
- OAuth tokens are stored in `sessionStorage` for runtime; refresh tokens are handled by the app.

License
- See LICENSE

Contact / Demo
- Live preview (latest): https://fieldops-delta.vercel.app
- For enterprise usage or questions, open an issue or contact the maintainers.
