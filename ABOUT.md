FieldOps — Field Technician Companion for HaloPSA

Short description
FieldOps is a lightweight Progressive Web App built as a companion to HaloPSA. It helps field technicians and service providers capture time, photos, and notes quickly and reliably while on the go.

Who it's for
- Managed Service Providers (MSPs)
- IT service desks with mobile field staff
- Businesses that need quick, offline-friendly time capture and ticket updates tied to HaloPSA

What it solves
- Reduces friction for time capture and ticket updates from the field
- Improves billable time accuracy with timers and travel/onsite tracking
- Lets technicians attach photographic evidence and concise notes to Actions

How it works
- Single-file PWA (`index.html`) — deploy to any static host or Vercel
- Uses OAuth PKCE to sign in to HaloPSA, then posts Actions to the Halo API
- Auto-discovers Outcomes and Action Types when the Halo instance exposes them; otherwise use manual configuration in Settings

Try it
- Live preview: https://fieldops-delta.vercel.app
- Deploy your own: `npx vercel --prod` (or serve the static file on any host)

Get help / Contribute
- Open an issue or submit a PR on the repo
- If you need help integrating with a particular HaloPSA instance, include your vendor swagger (OpenAPI) or ask your Halo admin to enable an ActionTypes listing endpoint.

Contact
- Maintainers: open an issue in this repository
