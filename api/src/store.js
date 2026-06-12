const { TableClient } = require("@azure/data-tables");
const { DefaultAzureCredential } = require("@azure/identity");
const { getConfig } = require("./config");

const memoryStore = new Map();

async function getTableClient() {
  const config = getConfig();
  if (config.storageConnectionString) {
    const client = TableClient.fromConnectionString(config.storageConnectionString, config.tableName);
    await client.createTable().catch(() => undefined);
    return client;
  }
  if (config.storageAccountUrl) {
    const client = new TableClient(config.storageAccountUrl, config.tableName, new DefaultAzureCredential());
    await client.createTable().catch(() => undefined);
    return client;
  }
  return null;
}

async function getConnection(userId) {
  const client = await getTableClient();
  if (!client) return memoryStore.get(userId) || null;
  try {
    return await client.getEntity("connection", userId);
  } catch {
    return null;
  }
}

async function saveConnection(userId, connection) {
  const entity = {
    partitionKey: "connection",
    rowKey: userId,
    ...connection,
  };
  const client = await getTableClient();
  if (!client) {
    memoryStore.set(userId, entity);
    return;
  }
  await client.upsertEntity(entity, "Replace");
}

async function deleteConnection(userId) {
  const client = await getTableClient();
  if (!client) {
    memoryStore.delete(userId);
    return;
  }
  await client.deleteEntity("connection", userId).catch(() => undefined);
}

async function getLookup(kind) {
  const client = await getTableClient();
  if (!client) return memoryStore.get(`lookup:${kind}`) || null;
  try {
    return await client.getEntity("lookup", kind);
  } catch {
    return null;
  }
}

async function saveLookup(kind, payload) {
  const entity = {
    partitionKey: "lookup",
    rowKey: kind,
    payload: JSON.stringify(payload),
    updatedAt: new Date().toISOString(),
  };
  const client = await getTableClient();
  if (!client) {
    memoryStore.set(`lookup:${kind}`, entity);
    return;
  }
  await client.upsertEntity(entity, "Replace");
}

module.exports = {
  getConnection,
  saveConnection,
  deleteConnection,
  getLookup,
  saveLookup,
};
