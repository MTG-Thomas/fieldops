# CI/CD for Azure-native FieldOps

## Pipelines

### CI

Workflow: [`.github/workflows/ci.yml`](/home/thomas/fieldops/.github/workflows/ci.yml)

- installs frontend dependencies with `npm ci`
- installs API dependencies with `npm --prefix api ci`
- builds the Vite frontend
- syntax-checks the Azure Functions files
- runs Playwright tests

### App deployment

Workflow: [`.github/workflows/deploy-swa.yml`](/home/thomas/fieldops/.github/workflows/deploy-swa.yml)

- triggers on pushes to `main` and manual dispatch
- deploys the frontend and the managed `/api` Azure Functions app using `Azure/static-web-apps-deploy`
- targets the existing Azure Static Web App via `AZURE_STATIC_WEB_APPS_API_TOKEN`

This workflow is the low-cost fit for **SWA Free** because Free supports **managed** APIs from the repo, not bring-your-own Functions.

### Infra deployment

Workflow: [`.github/workflows/deploy-infra.yml`](/home/thomas/fieldops/.github/workflows/deploy-infra.yml)

- manual only
- logs into Azure with a GitHub OIDC-enabled service principal
- pins deployment to the **Microsoft Azure Sponsorship** subscription
- creates/updates the resource group
- deploys the Bicep template

## Required GitHub secrets

- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `AZURE_CLIENT_ID`
- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET`
- `HALO_CLIENT_SECRET`
- `FIELDOPS_ENCRYPTION_KEY`

## Important platform note

The original plan assumed **SWA Free + separate Functions app + managed identity + Key Vault references**.

Current Microsoft docs do not allow that exact combination:

- **Bring your own Functions** is **Standard-only**
- **Managed identity** and **Key Vault references** are not supported for **managed functions**

For the initial pilot, CI/CD is therefore set up around **SWA Free with managed functions from `/api`**. If you want the exact backend model from the original plan, the first clean upgrade is **SWA Standard**.
