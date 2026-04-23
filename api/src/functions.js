const { app } = require("@azure/functions");
const { getUser } = require("./auth");
const { json, handleError } = require("./http");
const halo = require("./halo-client");
const service = require("./service");

app.http("session", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "session",
  handler: async (request) => {
    try {
      const user = getUser(request);
      return json(await service.buildSession(user));
    } catch (error) {
      return handleError(error);
    }
  },
});

app.http("halo-connect-start", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "halo/connect/start",
  handler: async (request) => {
    try {
      const user = getUser(request);
      return json(await service.startConnect(user));
    } catch (error) {
      return handleError(error);
    }
  },
});

app.http("halo-connect-callback", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "halo/connect/callback",
  handler: async (request) => {
    try {
      const user = getUser(request);
      const code = request.query.get("code");
      const state = request.query.get("state");
      if (!code || !state) {
        throw new Error("Missing Halo OAuth callback parameters");
      }
      await service.completeConnect(user, code, state);
      return {
        status: 302,
        headers: { Location: "/" },
      };
    } catch (error) {
      return handleError(error);
    }
  },
});

app.http("halo-disconnect", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "halo/disconnect",
  handler: async (request) => {
    try {
      const user = getUser(request);
      await service.disconnect(user);
      return json({ ok: true });
    } catch (error) {
      return handleError(error);
    }
  },
});

app.http("tickets", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "tickets",
  handler: async (request) => {
    try {
      const user = getUser(request);
      const token = await service.getAccessToken(user).catch(() => null);
      const data = await halo.getTickets(token);
      return json(data);
    } catch (error) {
      return handleError(error);
    }
  },
});

app.http("ticket-detail", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "tickets/{ticketId}",
  handler: async (request, context) => {
    try {
      const user = getUser(request);
      const token = await service.getAccessToken(user).catch(() => null);
      const detail = await halo.getTicketDetail(context.triggerMetadata.ticketId, token);
      const [availableActionTypes, availableOutcomes] = await Promise.all([
        halo.getActionTypes(token),
        halo.getOutcomes(token),
      ]);
      return json({
        ...detail,
        availableActionTypes,
        availableOutcomes,
      });
    } catch (error) {
      return handleError(error);
    }
  },
});

app.http("action-types", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "action-types",
  handler: async (request) => {
    try {
      const user = getUser(request);
      const token = await service.getAccessToken(user).catch(() => null);
      return json(await halo.getActionTypes(token));
    } catch (error) {
      return handleError(error);
    }
  },
});

app.http("outcomes", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "outcomes",
  handler: async (request) => {
    try {
      const user = getUser(request);
      const token = await service.getAccessToken(user).catch(() => null);
      return json(await halo.getOutcomes(token));
    } catch (error) {
      return handleError(error);
    }
  },
});

app.http("time-entries", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "time-entries",
  handler: async (request) => {
    try {
      const user = getUser(request);
      const token = await service.getAccessToken(user).catch(() => null);
      const command = await request.json();
      await halo.postTimeEntry(command, token);
      return json({ ok: true });
    } catch (error) {
      return handleError(error);
    }
  },
});

app.http("photos", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "photos",
  handler: async (request) => {
    try {
      const user = getUser(request);
      const token = await service.getAccessToken(user).catch(() => null);
      const command = await request.json();
      await halo.uploadPhoto(command, token);
      return json({ ok: true });
    } catch (error) {
      return handleError(error);
    }
  },
});

app.http("sync", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "sync",
  handler: async (request) => {
    try {
      const user = getUser(request);
      const token = await service.getAccessToken(user).catch(() => null);
      const batch = await request.json();
      const results = [];
      for (const item of batch.items || []) {
        try {
          if (item.type === "time-entry") {
            await halo.postTimeEntry(item.command, token);
          }
          results.push({ id: item.id, ok: true, message: "Synced" });
        } catch (error) {
          results.push({
            id: item.id,
            ok: false,
            message: error instanceof Error ? error.message : "Sync failed",
          });
        }
      }
      return json({ results });
    } catch (error) {
      return handleError(error);
    }
  },
});
