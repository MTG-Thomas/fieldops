/**
 * Shared test helpers — mock data, storage seeding, and API route setup.
 *
 * All API calls are routed to https://api.test and https://auth.test so tests
 * never touch the real HaloPSA instance.
 *
 * Storage layout (matches the app):
 *   localStorage  — fo_config, fo_job, fo_today, fo_date
 *   sessionStorage — fo_auth, fo_pkce_v
 */

const MOCK_CONFIG = {
  tenant: 'testco',
  authServer: 'https://auth.test',
  resourceServer: 'https://api.test',
  clientId: 'test-client-id',
  redirectUri: 'http://localhost:5000',
  scope: 'all',
  ticketFilter: 'mine',
  agentId: 37,
  actionTypeId: 2,
  actionOutcomeId: null,
  actionTypeMap: {},
};

const MOCK_TICKETS = [
  {
    id: 101,
    summary: 'Server down at client site',
    agent_id: 37,
    team_id: 5,
    priority_name: 'High',
    status_name: 'Open',
    status_id: 1,
    client_id: 10,
    site_id: 20,
  },
  {
    id: 102,
    summary: 'Printer not working',
    agent_id: 37,
    team_id: 5,
    priority_name: 'Normal',
    status_name: 'Open',
    status_id: 1,
    client_id: 11,
    site_id: 21,
  },
  {
    id: 103,
    summary: 'Another agent ticket',
    agent_id: 99,
    team_id: 5,
    priority_name: 'Low',
    status_name: 'Open',
    status_id: 1,
    client_id: 12,
    site_id: 22,
  },
];

const MOCK_CLIENT = { id: 10, name: 'Acme Corp', phone: null, website: null };
const MOCK_SITE = {
  id: 20,
  name: 'Main Office',
  address_1: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  postcode: '62701',
};

/**
 * Seed config only (no auth) — app will show the auth screen.
 */
async function seedConfig(page) {
  await page.addInitScript((cfg) => {
    localStorage.setItem('fo_config', JSON.stringify(cfg));
  }, MOCK_CONFIG);
}

/**
 * Seed config + valid auth token — app will show the main screen.
 * NOTE: auth lives in sessionStorage (not localStorage) per the app's design.
 */
async function seedAuth(page) {
  await page.addInitScript((cfg) => {
    localStorage.setItem('fo_config', JSON.stringify(cfg));
    sessionStorage.setItem('fo_auth', JSON.stringify({
      access_token: 'mock-token',
      refresh_token: null,
      expires_at: Date.now() + 3_600_000,
      agent_id: 37,
      agent_name: 'Thomas',
    }));
  }, MOCK_CONFIG);
}

/**
 * Seed an active job in 'done' phase without disturbing config or auth.
 * Call this AFTER seedAuth() to add a job on top of existing auth state.
 * @param {import('@playwright/test').Page} page
 * @param {number} ticketId
 */
async function seedActiveJob(page, ticketId = 101) {
  await page.addInitScript((id) => {
    const now = Date.now();
    const job = {
      ticketId: id,
      ticketSummary: 'Server down at client site',
      travelStart:  new Date(now - 30 * 60_000).toISOString(),
      travelEnd:    new Date(now - 20 * 60_000).toISOString(),
      onsiteStart:  new Date(now - 20 * 60_000).toISOString(),
      onsiteEnd:    new Date(now -  5 * 60_000).toISOString(),
      onsiteGPS:    null,
      log:          [],
    };
    localStorage.setItem('fo_job', JSON.stringify(job));
  }, ticketId);
}

/**
 * Register route mocks for the HaloPSA API.
 *
 * Uses a single function-based handler per domain to avoid glob ordering
 * ambiguity. Specific path checks are done inside the handler.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ tickets?: object[] }} options
 */
async function mockHaloAPI(page, { tickets = MOCK_TICKETS } = {}) {
  // Auth server: intercept any request (OAuth authorize, token endpoint, etc.)
  await page.route(/https:\/\/auth\.test\//, route =>
    route.fulfill({ status: 404, body: 'Not found' })
  );

  // API server: dispatch by path
  await page.route(/https:\/\/api\.test\//, async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.startsWith('/Tickets')) {
      return route.fulfill({ json: tickets });
    }
    if (path.startsWith('/Client/')) {
      return route.fulfill({ json: MOCK_CLIENT });
    }
    if (path.startsWith('/Site/')) {
      return route.fulfill({ json: MOCK_SITE });
    }
    if (path === '/Actions' && route.request().method() === 'POST') {
      return route.fulfill({ status: 200, json: [{ id: 999, ticket_id: 101 }] });
    }

    // All other endpoints (discovery probes, /Agent, /Me, etc.) → 404
    return route.fulfill({ status: 404, body: 'Not found' });
  });
}

module.exports = {
  MOCK_CONFIG,
  MOCK_TICKETS,
  MOCK_CLIENT,
  MOCK_SITE,
  seedConfig,
  seedAuth,
  seedActiveJob,
  mockHaloAPI,
};
