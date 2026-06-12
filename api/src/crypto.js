const crypto = require("node:crypto");
const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");
const { getConfig } = require("./config");

let cachedKey;

async function getKey() {
  if (cachedKey) return cachedKey;
  const config = getConfig();
  if (config.encryptionKey) {
    cachedKey = Buffer.from(config.encryptionKey, "base64");
    return cachedKey;
  }
  if (config.keyVaultUrl) {
    const client = new SecretClient(config.keyVaultUrl, new DefaultAzureCredential());
    const secret = await client.getSecret(config.encryptionSecretName);
    cachedKey = Buffer.from(secret.value, "base64");
    return cachedKey;
  }
  cachedKey = crypto.createHash("sha256").update("fieldops-local-dev-key").digest();
  return cachedKey;
}

async function encryptString(value) {
  const key = await getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

async function decryptString(value) {
  const key = await getKey();
  const raw = Buffer.from(value, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

module.exports = {
  encryptString,
  decryptString,
};
