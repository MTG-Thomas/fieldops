const crypto = require("node:crypto");
const { getConfig } = require("./config");

function parseHeaderPrincipal(request) {
  const encoded = request.headers.get("x-ms-client-principal");
  if (!encoded) return null;
  try {
    const json = Buffer.from(encoded, "base64").toString("utf8");
    const principal = JSON.parse(json);
    return {
      id: principal.userId || principal.claims?.find((claim) => claim.typ === "http://schemas.microsoft.com/identity/claims/objectidentifier")?.val,
      displayName: principal.userDetails || "Authenticated user",
      email: principal.claims?.find((claim) => claim.typ === "emails" || claim.typ === "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.val,
      roles: principal.userRoles || ["authenticated"],
    };
  } catch {
    return null;
  }
}

function getUser(request) {
  const config = getConfig();
  const principal = parseHeaderPrincipal(request);
  if (principal) return principal;
  return {
    id: config.mockUserId,
    displayName: config.mockUserName,
    email: config.mockUserEmail,
    roles: ["authenticated", "admin"],
  };
}

function createState(userId, redirectTo = "/") {
  const config = getConfig();
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      redirectTo,
      ts: Date.now(),
    }),
  ).toString("base64url");
  const secret = config.encryptionKey || "fieldops-dev-state-secret";
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function validateState(state) {
  const config = getConfig();
  const [payload, signature] = String(state || "").split(".");
  if (!payload || !signature) {
    throw new Error("Missing or malformed Halo OAuth state");
  }
  const secret = config.encryptionKey || "fieldops-dev-state-secret";
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (expected !== signature) {
    throw new Error("Invalid Halo OAuth state signature");
  }
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!parsed.userId || !parsed.ts) {
    throw new Error("Invalid Halo OAuth state payload");
  }
  return parsed;
}

module.exports = {
  getUser,
  createState,
  validateState,
};
