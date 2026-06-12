FieldOps is an internal-first Azure-native field technician app for HaloPSA.

What changed in this version:

- Frontend moved from a single static HTML file to a React + TypeScript PWA.
- Hosting target moved from generic static hosting toward Azure Static Web Apps Free.
- Authentication moved to Microsoft Entra ID at the app edge.
- Halo access moved behind an Azure Functions backend-for-frontend.
- Halo refresh tokens are stored server-side, encrypted before persistence.
- Azure Table Storage and Key Vault are the default low-cost persistence and secret layers.
- The repo now includes an explicit option-2 viability spike for evaluating Entra-native delegated Halo API access later.

The product goal is still the same:

- fast ticket context
- travel / onsite workflow
- quick time entry
- field notes
- photo capture
- low operational overhead for a small technician team
