import dotenv from "dotenv";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

dotenv.config({ path: ".env.local" });

const endpoint = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "6946f98a001db8a3ab3a";
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || "69d787ad002831c59b48";
const functionId = process.env.APPWRITE_TASBEEH_SYNC_FUNCTION_ID || "tasbeeh-sync";
const eventsCollectionId = "tasbeeh_sync_events";

if (!apiKey) {
  throw new Error("APPWRITE_API_KEY is required in .env.local");
}

const headers = {
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

async function request(url, options = {}) {
  const response = await fetch(`${endpoint}${url}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(body?.message || `Appwrite request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

async function ensureCollection() {
  try {
    await request(`/databases/${databaseId}/collections/${eventsCollectionId}`);
    console.log(`Events collection exists: ${eventsCollectionId}`);
    return;
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  await request(`/databases/${databaseId}/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectionId: eventsCollectionId,
      name: "Tasbeeh Sync Events",
      permissions: [],
      documentSecurity: false,
      enabled: true,
    }),
  });
  console.log(`Created events collection: ${eventsCollectionId}`);
}

async function ensureAttribute(type, key, sizeOrRequired, requiredOrMin) {
  try {
    await request(`/databases/${databaseId}/collections/${eventsCollectionId}/attributes/${key}`);
    return;
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  const body = type === "integer"
    ? { key, required: requiredOrMin }
    : { key, size: sizeOrRequired, required: requiredOrMin };
  await request(`/databases/${databaseId}/collections/${eventsCollectionId}/attributes/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log(`Created ${type} attribute: ${key}`);
}

async function ensureEventsCollectionSchema() {
  await ensureCollection();
  await ensureAttribute("string", "eventId", 128, true);
  await ensureAttribute("string", "userId", 128, true);
  await ensureAttribute("string", "date", 10, true);
  await ensureAttribute("integer", "amount", undefined, true);
  await ensureAttribute("string", "sessionId", 128, false);
  await ensureAttribute("string", "createdAt", 40, true);
  try {
    await request(`/databases/${databaseId}/collections/${eventsCollectionId}/indexes/eventId_unique`);
  } catch (error) {
    if (error.status !== 404) throw error;
    await request(`/databases/${databaseId}/collections/${eventsCollectionId}/indexes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        indexId: "eventId_unique",
        key: "eventId_unique",
        type: "unique",
        attributes: ["eventId"],
      }),
    });
  }
}

async function ensureFunction() {
  try {
    const existing = await request(`/functions/${functionId}`);
    console.log(`Function exists: ${existing.$id}`);
    return existing;
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  const created = await request("/functions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      functionId,
      name: "Tasbeeh Sync",
      runtime: "node-22",
      execute: ["users"],
      timeout: 30,
      enabled: true,
    }),
  });
  console.log(`Created function: ${created.$id}`);
  return created;
}

async function configureFunctionVariables() {
  const current = await request(`/functions/${functionId}/variables`);
  const values = {
    APPWRITE_FUNCTION_PROJECT_ID: projectId,
    APPWRITE_FUNCTION_API_ENDPOINT: endpoint,
    APPWRITE_API_KEY: apiKey,
    APPWRITE_DATABASE_ID: databaseId,
    APPWRITE_EVENTS_COLLECTION_ID: eventsCollectionId,
    APPWRITE_PROGRESS_COLLECTION_ID: "tasbeeh_progress",
    APPWRITE_GOALS_COLLECTION_ID: "tasbeeh_progress_goals",
  };

  for (const [key, value] of Object.entries(values)) {
    const existing = current.variables?.find((variable) => variable.key === key);
    if (existing) {
      const variableId = existing.$id || existing.id;
      await request(`/functions/${functionId}/variables/${variableId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
    } else {
      await request(`/functions/${functionId}/variables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, secret: key === "APPWRITE_API_KEY" }),
      });
    }
  }
  console.log("Function variables configured.");
}

async function deployFunction() {
  const source = path.resolve("functions", "tasbeeh-sync");
  if (!existsSync(source)) throw new Error(`Missing function source: ${source}`);

  const archive = path.join(os.tmpdir(), `tasbeeh-sync-${Date.now()}.tar.gz`);
  try {
    const tarSource = source.replaceAll("\\", "/").replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
    execFileSync("tar", ["-czf", path.basename(archive), "-C", tarSource, "."], {
      cwd: os.tmpdir(),
      stdio: "inherit",
    });
    const code = await readFile(archive);
    const form = new FormData();
    form.append("code", new Blob([code], { type: "application/gzip" }), "tasbeeh-sync.tar.gz");
    form.append("activate", "true");
    form.append("entrypoint", "src/main.js");
    form.append("commands", "npm install");

    const deployment = await request(`/functions/${functionId}/deployments`, {
      method: "POST",
      body: form,
    });
    console.log(`Deployment created: ${deployment.$id}`);
  } finally {
    await rm(archive, { force: true });
  }
}

await ensureEventsCollectionSchema();
await ensureFunction();
await configureFunctionVariables();
await deployFunction();
console.log("Tasbeeh sync Function provisioned.");
