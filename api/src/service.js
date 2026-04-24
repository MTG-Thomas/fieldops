const { createState, validateState } = require("./auth");
const { decryptString, encryptString } = require("./crypto");
const { getConfig } = require("./config");
const {
  deleteConnection,
  getConnection,
  saveConnection,
} = require("./store");
const halo = require("./halo-client");

async function buildSession(user) {
  const config = getConfig();
  if (config.useMockData) {
    return {
      user,
      haloConnection: {
        connected: true,
        connectedAt: new Date().toISOString(),
        haloUserId: "mock-agent-37",
        haloTenant: "mock-halo",
        mode: "halo-oauth",
      },
      capabilities: {
        canQueueOffline: true,
        canUploadPhotos: true,
        option2EvaluationPending: true,
      },
    };
  }
  const connection = await getConnection(user.id);
  return {
    user,
    haloConnection: {
      connected: Boolean(connection),
      connectedAt: connection?.connectedAt,
      haloUserId: connection?.haloUserId,
      haloTenant: connection?.haloTenant,
      mode: "halo-oauth",
    },
    capabilities: {
      canQueueOffline: true,
      canUploadPhotos: true,
      option2EvaluationPending: true,
    },
  };
}

async function startConnect(user) {
  const config = getConfig();
  if (config.useMockData) {
    return { authorizeUrl: "/" };
  }
  if (!config.haloAuthUrl || !config.haloClientId || !config.haloRedirectUri) {
    throw new Error("Halo OAuth is not configured");
  }
  const state = createState(user.id);
  const authorizeUrl = `${config.haloAuthUrl}/authorize?${new URLSearchParams({
    response_type: "code",
    client_id: config.haloClientId,
    redirect_uri: config.haloRedirectUri,
    scope: "all",
    state,
  }).toString()}`;
  return { authorizeUrl };
}

async function completeConnect(user, code, state) {
  const parsed = validateState(state);
  if (parsed.userId !== user.id) {
    throw new Error("Halo OAuth callback user mismatch");
  }
  const tokens = await halo.exchangeCodeForToken(code);
  const encryptedRefreshToken = await encryptString(tokens.refresh_token);
  await saveConnection(user.id, {
    haloUserId: tokens.halo_user_id || null,
    haloTenant: getConfig().haloApiUrl || "mock-halo",
    encryptedRefreshToken,
    connectedAt: new Date().toISOString(),
  });
}

async function disconnect(user) {
  if (getConfig().useMockData) {
    return;
  }
  await deleteConnection(user.id);
}

async function getAccessToken(user) {
  if (getConfig().useMockData) {
    return null;
  }
  const connection = await getConnection(user.id);
  if (!connection?.encryptedRefreshToken) {
    throw new Error("Halo connection required");
  }
  const refreshToken = await decryptString(connection.encryptedRefreshToken);
  const refreshed = await halo.refreshAccessToken(refreshToken);
  if (refreshed.refresh_token && refreshed.refresh_token !== refreshToken) {
    const encryptedRefreshToken = await encryptString(refreshed.refresh_token);
    await saveConnection(user.id, {
      ...connection,
      encryptedRefreshToken,
    });
  }
  return refreshed.access_token;
}

module.exports = {
  buildSession,
  startConnect,
  completeConnect,
  disconnect,
  getAccessToken,
};
