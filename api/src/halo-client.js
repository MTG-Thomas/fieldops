const { getConfig } = require("./config");
const { actionTypes, outcomes, tickets } = require("./mock-data");
const { getLookup, saveLookup } = require("./store");

async function exchangeCodeForToken(code) {
  const config = getConfig();
  if (config.useMockData || !config.haloAuthUrl) {
    return {
      access_token: `mock-access-${code}`,
      refresh_token: `mock-refresh-${code}`,
      expires_in: 3600,
      halo_user_id: "mock-agent-37",
    };
  }

  const secret = config.haloClientSecret;
  if (!secret || !config.haloClientId || !config.haloRedirectUri) {
    throw new Error("Halo OAuth is not fully configured");
  }

  const response = await fetch(`${config.haloAuthUrl}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.haloClientId,
      client_secret: secret,
      redirect_uri: config.haloRedirectUri,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Halo token exchange failed (${response.status})`);
  }
  return response.json();
}

async function refreshAccessToken(refreshToken) {
  const config = getConfig();
  if (config.useMockData || !config.haloAuthUrl) {
    return {
      access_token: `mock-access-${Date.now()}`,
      refresh_token: refreshToken,
      expires_in: 3600,
    };
  }
  const response = await fetch(`${config.haloAuthUrl}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.haloClientId,
      client_secret: config.haloClientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Halo token refresh failed (${response.status})`);
  }
  return response.json();
}

async function fetchWithBearer(path, accessToken, options) {
  const config = getConfig();
  const headers = options?.headers
    ? {
        Authorization: `Bearer ${accessToken}`,
        ...(options?.body ? { "Content-Type": "application/json" } : undefined),
        ...options.headers,
      }
    : {
        Authorization: `Bearer ${accessToken}`,
        ...(options?.body ? { "Content-Type": "application/json" } : undefined),
      };
  const response = await fetch(`${config.haloApiUrl}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Halo API failed (${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function normalizeTicket(ticket) {
  return {
    id: Number(ticket.id),
    summary: ticket.summary || ticket.title || `Ticket ${ticket.id}`,
    status: ticket.status || ticket.status_name || "Open",
    priority: ticket.priority || ticket.priority_name || "Normal",
    clientName: ticket.clientName || ticket.client_name || "Unknown client",
    siteName: ticket.siteName || ticket.site_name || "",
    assignedTo: ticket.assignedTo || ticket.agent_name || "",
    updatedAt: ticket.updatedAt || ticket.lastupdated || new Date().toISOString(),
    clientId: ticket.clientId || ticket.client_id,
    siteId: ticket.siteId || ticket.site_id,
    address: ticket.address,
    latestNotes: ticket.latestNotes || [],
  };
}

async function getTickets(accessToken) {
  const config = getConfig();
  if (config.useMockData || !config.haloApiUrl) return tickets.map(normalizeTicket);
  const data = await fetchWithBearer("/Tickets?open_only=true&count=100", accessToken);
  return (Array.isArray(data) ? data : data.tickets || []).map(normalizeTicket);
}

async function getTicketDetail(ticketId, accessToken) {
  const all = await getTickets(accessToken);
  const match = all.find((ticket) => ticket.id === Number(ticketId));
  if (!match) {
    throw new Error(`Ticket ${ticketId} was not found`);
  }
  return match;
}

async function getCachedLookup(kind, loader) {
  const config = getConfig();
  const cached = await getLookup(kind);
  if (cached?.payload && cached.updatedAt) {
    const ageMs = Date.now() - Date.parse(cached.updatedAt);
    if (ageMs < config.outcomesCacheMinutes * 60 * 1000) {
      return JSON.parse(cached.payload);
    }
  }
  const fresh = await loader();
  await saveLookup(kind, fresh);
  return fresh;
}

async function getActionTypes(accessToken) {
  const config = getConfig();
  return getCachedLookup("actionTypes", async () => {
    if (config.useMockData || !config.haloApiUrl) return actionTypes;
    const data = await fetchWithBearer("/ActionTypes", accessToken);
    return (Array.isArray(data) ? data : data.items || []).map((item) => ({
      id: String(item.id ?? item.ActionTypeId ?? item.value),
      label: item.name ?? item.Name ?? item.label ?? `Action ${item.id}`,
    }));
  });
}

async function getOutcomes(accessToken) {
  const config = getConfig();
  return getCachedLookup("outcomes", async () => {
    if (config.useMockData || !config.haloApiUrl) return outcomes;
    const data = await fetchWithBearer("/Outcomes", accessToken);
    return (Array.isArray(data) ? data : data.items || []).map((item) => ({
      id: String(item.id ?? item.OutcomeId ?? item.value),
      label: item.name ?? item.Name ?? item.label ?? `Outcome ${item.id}`,
    }));
  });
}

async function postTimeEntry(command, accessToken) {
  const config = getConfig();
  if (config.useMockData || !config.haloApiUrl) {
    return { ok: true, id: command.idempotencyKey };
  }
  const start = new Date(command.startDatetime);
  const end = new Date(command.endDatetime);
  const minutes = Math.max(1, Math.round((end - start) / 60000));
  return fetchWithBearer("/Actions", accessToken, {
    method: "POST",
    body: JSON.stringify([
      {
        ticket_id: command.ticketId,
        timetaken: minutes,
        startdatetime: command.startDatetime,
        note: command.note,
        actiontype_id: command.actionTypeId ? Number(command.actionTypeId) : undefined,
        outcome_id: command.outcomeId ? Number(command.outcomeId) : undefined,
      },
    ]),
  });
}

async function uploadPhoto(command, accessToken) {
  const config = getConfig();
  if (config.useMockData || !config.haloApiUrl) {
    return { ok: true };
  }
  return fetchWithBearer(`/Tickets/${command.ticketId}/Attachments`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      filename: command.filename,
      contentType: command.contentType,
      base64: command.base64,
      note: command.note,
    }),
  });
}

module.exports = {
  exchangeCodeForToken,
  refreshAccessToken,
  getTickets,
  getTicketDetail,
  getActionTypes,
  getOutcomes,
  postTimeEntry,
  uploadPhoto,
};
