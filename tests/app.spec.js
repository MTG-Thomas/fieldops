const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

test.describe("Azure-native FieldOps", () => {
  test("shows connect halo screen when halo is not linked", async ({ page }) => {
    await mockApi(page, {
      session: {
        user: {
          id: "user-123",
          displayName: "Thomas Bray",
          email: "thomas@example.com",
          roles: ["authenticated"],
        },
        haloConnection: {
          connected: false,
          mode: "halo-oauth",
        },
        capabilities: {
          canQueueOffline: true,
          canUploadPhotos: true,
          option2EvaluationPending: true,
        },
      },
    });

    await page.goto("/");
    await expect(page.getByText("Connect Halo once, then work from here.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect Halo" })).toBeVisible();
  });

  test("loads tickets for a connected user", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByText("Server down at client site")).toBeVisible();
    await expect(page.getByText("Printer not working")).toBeVisible();
  });

  test("opens a ticket and drives the job flow", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");

    await page.getByText("Server down at client site").click();
    await expect(page.getByText("Ticket #101")).toBeVisible();

    await page.getByRole("button", { name: "Start travel" }).click();
    await expect(page.getByText("traveling")).toBeVisible();

    await page.getByRole("button", { name: "Stop travel" }).click();
    await page.getByRole("button", { name: "Check in" }).click();
    await expect(page.getByRole("button", { name: "Check out" })).toBeVisible();
  });

  test("posts time entry through the BFF shape", async ({ page }) => {
    await mockApi(page);
    let postedBody = null;

    await page.route("**/api/time-entries", async (route) => {
      postedBody = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true } });
    });

    await page.goto("/");
    await page.getByText("Server down at client site").click();
    await page.locator("#te-start").fill("09:00");
    await page.locator("#te-end").fill("10:30");
    await page.locator("#te-note").fill("Replaced failed drive");
    await page.getByRole("button", { name: "Post to Halo" }).click();

    await expect(page.getByText("Time entry posted")).toBeVisible();
    expect(postedBody.ticketId).toBe(101);
    expect(postedBody.note).toBe("Replaced failed drive");
    expect(postedBody.workType).toBe("onsite");
  });
});
