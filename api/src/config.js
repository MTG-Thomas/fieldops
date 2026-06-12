function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required configuration: ${name}`);
  }
  return value;
}

function getConfig() {
  return {
    useMockData: process.env.FIELDOPS_USE_MOCK_DATA === "true",
    mockUserId: process.env.FIELDOPS_MOCK_USER_ID || "mock-user",
    mockUserName: process.env.FIELDOPS_MOCK_USER_NAME || "FieldOps User",
    mockUserEmail: process.env.FIELDOPS_MOCK_USER_EMAIL || "fieldops@example.com",
    tableName: process.env.FIELDOPS_TABLE_NAME || "FieldOpsConnections",
    storageConnectionString: process.env.FIELDOPS_STORAGE_CONNECTION_STRING || "",
    storageAccountUrl: process.env.FIELDOPS_STORAGE_ACCOUNT_URL || "",
    keyVaultUrl: process.env.FIELDOPS_KEY_VAULT_URL || "",
    encryptionSecretName: process.env.FIELDOPS_ENCRYPTION_SECRET_NAME || "fieldops-encryption-key",
    encryptionKey: process.env.FIELDOPS_ENCRYPTION_KEY || "",
    haloAuthUrl: process.env.HALO_AUTH_URL || "",
    haloApiUrl: process.env.HALO_API_URL || "",
    haloClientId: process.env.HALO_CLIENT_ID || "",
    haloClientSecretName: process.env.HALO_CLIENT_SECRET_NAME || "halo-client-secret",
    haloClientSecret: process.env.HALO_CLIENT_SECRET || "",
    haloRedirectUri: process.env.HALO_REDIRECT_URI || "",
    outcomesCacheMinutes: Number(process.env.FIELDOPS_LOOKUP_CACHE_MINUTES || "30"),
  };
}

module.exports = {
  getConfig,
  required,
};
