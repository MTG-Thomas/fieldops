const { test, expect } = require('@playwright/test');
const {
  seedConfig,
  seedAuth,
  seedActiveJob,
  mockHaloAPI,
} = require('./helpers');

// ─────────────────────────────────────────────────────────────────────────────
// First run — config screen
// ─────────────────────────────────────────────────────────────────────────────
test.describe('First run', () => {
  test('shows config screen when no config is stored', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#screen-config')).toBeVisible();
    await expect(page.locator('#screen-auth')).toBeHidden();
    await expect(page.locator('#screen-app')).toBeHidden();
  });

  test('saving config starts the OAuth PKCE flow', async ({ page }) => {
    await page.goto('/');
    await page.fill('#cfg-auth', 'https://auth.test');
    await page.fill('#cfg-api', 'https://api.test');
    await page.fill('#cfg-client-id', 'test-client-id');

    const [req] = await Promise.all([
      page.waitForRequest(r => r.url().includes('auth.test')),
      page.click('#btn-save-config'),
    ]);
    expect(req.url()).toContain('client_id=test-client-id');
    expect(req.url()).toContain('code_challenge_method=S256');
  });

  test('saved config persists across page loads', async ({ page }) => {
    // Let the auth redirect succeed (returns a static page) so we can navigate back
    await page.route('https://auth.test/**', route =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>ok</body></html>' })
    );
    await page.goto('/');
    await page.fill('#cfg-auth', 'https://auth.test');
    await page.fill('#cfg-api', 'https://api.test');
    await page.fill('#cfg-client-id', 'test-client-id');
    await page.click('#btn-save-config');

    // Navigate back to the app — if config persisted, it skips the config screen
    await page.goto('/');
    await expect(page.locator('#screen-auth')).toBeVisible();
    await expect(page.locator('#screen-config')).toBeHidden();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth screen
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Auth screen', () => {
  test.beforeEach(async ({ page }) => {
    await seedConfig(page);
  });

  test('shows auth screen when config is present but no token', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#screen-auth')).toBeVisible();
    await expect(page.locator('#screen-config')).toBeHidden();
    await expect(page.locator('#screen-app')).toBeHidden();
  });

  test('sign in button initiates PKCE redirect', async ({ page }) => {
    await page.goto('/');
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('auth.test')),
      page.click('#btn-sign-in'),
    ]);
    expect(request.url()).toContain('response_type=code');
    expect(request.url()).toContain('code_challenge_method=S256');
    expect(request.url()).toContain('test-client-id');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ticket list
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Ticket list', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockHaloAPI(page);
  });

  test('loads and displays tickets assigned to the current agent', async ({ page }) => {
    await page.goto('/');
    // MOCK_TICKETS has 2 tickets for agent 37 and 1 for agent 99; 'mine' filter shows 2
    await expect(page.locator('.ticket-card')).toHaveCount(2);
    await expect(page.locator('.ticket-card').first()).toContainText('Server down at client site');
  });

  test('shows all tickets when filter is "all"', async ({ page }) => {
    await page.addInitScript(() => {
      const cfg = JSON.parse(localStorage.getItem('fo_config') || '{}');
      cfg.ticketFilter = 'all';
      localStorage.setItem('fo_config', JSON.stringify(cfg));
    });
    await page.goto('/');
    await expect(page.locator('.ticket-card')).toHaveCount(3);
  });

  test('shows empty state when no tickets match', async ({ page }) => {
    await mockHaloAPI(page, { tickets: [] });
    await page.goto('/');
    await expect(page.locator('#ticket-list')).toContainText('No tickets');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ticket detail
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Ticket detail', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockHaloAPI(page);
    await page.goto('/');
  });

  test('opens ticket detail overlay when a ticket is tapped', async ({ page }) => {
    await page.locator('.ticket-card').first().click();
    await expect(page.locator('#ticket-detail')).toBeVisible();
    await expect(page.locator('#detail-tid')).toContainText('#101');
    await expect(page.locator('#detail-summary')).toContainText('Server down at client site');
  });

  test('shows job action buttons in detail', async ({ page }) => {
    await page.locator('.ticket-card').first().click();
    await expect(page.locator('#job-actions-container')).toBeVisible();
  });

  test('shows manual time entry form', async ({ page }) => {
    await page.locator('.ticket-card').first().click();
    await expect(page.locator('#te-start')).toBeVisible();
    await expect(page.locator('#te-end')).toBeVisible();
    await expect(page.locator('#btn-post-time')).toBeVisible();
  });

  test('closes detail overlay when back is pressed', async ({ page }) => {
    await page.locator('.ticket-card').first().click();
    await expect(page.locator('#ticket-detail')).toBeVisible();
    await page.locator('#btn-back').click();
    await expect(page.locator('#ticket-detail')).toBeHidden();
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Job flow — state machine
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Job flow', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockHaloAPI(page);
    await page.goto('/');
    await page.locator('.ticket-card').first().click();
  });

  test('Start Travel transitions to traveling phase and shows banner', async ({ page }) => {
    await page.locator('[data-action="startTravel"]').first().click();
    await expect(page.locator('#job-banner')).toBeVisible();
    // In traveling phase the banner button label changes to "Stop Travel"
    await expect(page.locator('#banner-btn')).toContainText(/stop travel/i);
  });

  test('Stop Travel transitions to arrived phase', async ({ page }) => {
    await page.locator('[data-action="startTravel"]').first().click();
    await page.locator('#job-actions-container [data-action="stopTravel"]').click();
    await expect(page.locator('#job-actions-container')).toContainText(/check in/i);
  });

  test('Check In transitions to onsite phase', async ({ page }) => {
    await page.locator('[data-action="startTravel"]').first().click();
    await page.locator('#job-actions-container [data-action="stopTravel"]').click();
    await page.locator('#job-actions-container [data-action="checkIn"]').click();
    // In onsite phase the banner button changes to "Check Out"
    await expect(page.locator('#banner-btn')).toContainText(/check out/i);
  });

  test('Check Out transitions to done phase and shows Finish & Log', async ({ page }) => {
    await page.locator('[data-action="startTravel"]').first().click();
    await page.locator('#job-actions-container [data-action="stopTravel"]').click();
    await page.locator('#job-actions-container [data-action="checkIn"]').click();
    await page.locator('#job-actions-container [data-action="checkOut"]').click();
    await expect(page.locator('#job-actions-container [data-action="finishLog"]')).toBeVisible();
  });

  test('job events appear in the activity log', async ({ page }) => {
    await page.locator('[data-action="startTravel"]').first().click();
    await expect(page.locator('#detail-activity-log')).toContainText(/travel started/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Time entry
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Time entry', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockHaloAPI(page);
    await page.goto('/');
    await page.locator('.ticket-card').first().click();
  });

  test('shows validation toast when times are missing', async ({ page }) => {
    await page.click('#btn-post-time');
    await expect(page.locator('.toast')).toContainText(/start and end/i);
  });

  test('shows validation toast when end is before start', async ({ page }) => {
    await page.fill('#te-start', '14:00');
    await page.fill('#te-end', '13:00');
    await page.click('#btn-post-time');
    await expect(page.locator('.toast')).toContainText(/end time must be after/i);
  });

  test('posts time entry and shows success toast', async ({ page }) => {
    let postedBody = null;
    await page.route(/https:\/\/api\.test\//, async route => {
      if (new URL(route.request().url()).pathname === '/Actions' && route.request().method() === 'POST') {
        postedBody = JSON.parse(route.request().postData());
        return route.fulfill({ status: 200, json: [{ id: 999 }] });
      }
      return route.continue();
    });

    await page.fill('#te-start', '09:00');
    await page.fill('#te-end', '10:30');
    await page.fill('#te-note', 'Replaced failed hard drive');
    await page.click('#btn-post-time');

    await expect(page.locator('.toast')).toContainText(/posted/i);
    expect(postedBody).toBeTruthy();
    expect(postedBody[0].ticket_id).toBe(101);
    expect(postedBody[0].timetaken).toBe(90);
    expect(postedBody[0].note).toBe('Replaced failed hard drive');
    expect(postedBody[0].actiontype_id).toBe(2);
  });

  test('clears time fields after successful post', async ({ page }) => {
    await page.fill('#te-start', '09:00');
    await page.fill('#te-end', '10:00');
    await page.click('#btn-post-time');
    await expect(page.locator('.toast')).toContainText(/posted/i);
    await expect(page.locator('#te-start')).toHaveValue('');
    await expect(page.locator('#te-end')).toHaveValue('');
  });

  test('autofill populates times from a completed job', async ({ page }) => {
    // seedActiveJob adds fo_job to localStorage on top of what beforeEach seeded
    await seedActiveJob(page);
    await page.reload();
    await page.locator('.ticket-card').first().click();
    await page.click('#btn-autofill');
    const start = await page.inputValue('#te-start');
    const end = await page.inputValue('#te-end');
    expect(start).toBeTruthy();
    expect(end).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockHaloAPI(page);
    await page.goto('/');
  });

  test('settings tab is accessible from nav', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="settings"]').click();
    await expect(page.locator('#tab-settings')).toBeVisible();
  });

  test('persists agent ID change to localStorage', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="settings"]').click();
    await page.fill('#set-agent-id', '42');
    await page.click('#btn-save-settings');
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('fo_config'))
    );
    // agentId is stored as a number (parseInt'd by collectConfigForm)
    expect(stored.agentId).toBe(42);
  });

  test('sign out clears auth and returns to auth screen', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="settings"]').click();
    // sign out button shows a confirm() dialog — accept it
    page.once('dialog', dialog => dialog.accept());
    await page.click('#btn-sign-out');
    await expect(page.locator('#screen-auth')).toBeVisible();
    const auth = await page.evaluate(() => sessionStorage.getItem('fo_auth'));
    expect(auth).toBeNull();
  });
});
