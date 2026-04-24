async function mockApi(page, overrides = {}) {
  const session = overrides.session ?? {
    user: {
      id: "user-123",
      displayName: "Thomas Bray",
      email: "thomas@example.com",
      roles: ["authenticated", "admin"],
    },
    haloConnection: {
      connected: true,
      connectedAt: new Date().toISOString(),
      haloUserId: "agent-37",
      haloTenant: "midtowntg",
      mode: "halo-oauth",
    },
    capabilities: {
      canQueueOffline: true,
      canUploadPhotos: true,
      option2EvaluationPending: true,
    },
  };

  const tickets = overrides.tickets ?? [
    {
      id: 101,
      summary: "Server down at client site",
      status: "Open",
      priority: "High",
      clientName: "Acme Corp",
      siteName: "Main Office",
    },
    {
      id: 102,
      summary: "Printer not working",
      status: "Open",
      priority: "Normal",
      clientName: "Contoso Legal",
      siteName: "South Branch",
    },
  ];

  const detail = overrides.detail ?? {
    id: 101,
    summary: "Server down at client site",
    status: "Open",
    priority: "High",
    clientName: "Acme Corp",
    siteName: "Main Office",
    address: "123 Main St, Springfield, IL 62701",
    availableActionTypes: [
      { id: "2", label: "On-site Work" },
      { id: "5", label: "Travel" },
    ],
    availableOutcomes: [{ id: "1", label: "Completed" }],
  };

  await page.route("**/api/session", async (route) => {
    await route.fulfill({ json: session });
  });

  await page.route("**/api/tickets", async (route) => {
    await route.fulfill({ json: tickets });
  });

  await page.route("**/api/tickets/101", async (route) => {
    await route.fulfill({ json: detail });
  });

  await page.route("**/api/outcomes", async (route) => {
    await route.fulfill({ json: detail.availableOutcomes ?? [{ id: "1", label: "Completed" }] });
  });

  await page.route("**/api/action-types**", async (route) => {
    await route.fulfill({ json: detail.availableActionTypes ?? [{ id: "2", label: "On-site Work" }] });
  });

  await page.route("**/api/halo/connect/start", async (route) => {
    await route.fulfill({ json: { authorizeUrl: "https://halo.example/connect" } });
  });

  await page.route("**/api/halo/disconnect", async (route) => {
    await route.fulfill({ json: { ok: true } });
  });

  await page.route("**/api/photos", async (route) => {
    await route.fulfill({ json: { ok: true } });
  });

  await page.route("**/api/sync", async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      json: {
        results: (body.items || []).map((item) => ({ id: item.id, ok: true, message: "Synced" })),
      },
    });
  });
}

module.exports = {
  mockApi,
};
