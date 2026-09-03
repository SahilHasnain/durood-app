/**
 * Move one user's Appwrite data from a legacy identity to an Appwrite Auth ID.
 *
 * Usage:
 *   node scripts/migrate-user-to-appwrite.js <old-user-id> <new-appwrite-user-id> --apply
 */

require("dotenv").config({ path: ".env.local" });
const { Client, Databases, Query } = require("node-appwrite");

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.DATABASE_ID || process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const collections = ["tasbeeh_progress"];
const [oldUserId, newUserId] = process.argv.slice(2).filter((arg) => arg !== "--apply");
const apply = process.argv.includes("--apply");

if (!endpoint || !projectId || !apiKey || !databaseId || !oldUserId || !newUserId) {
  console.error("Missing configuration or migration IDs.");
  process.exit(1);
}

if (oldUserId === newUserId) {
  console.error("Old and new user IDs must be different.");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

function replacePermissionOwner(permission) {
  return permission.replace(`user:${oldUserId}`, `user:${newUserId}`);
}

async function migrateCollection(collectionId) {
  const response = await databases.listDocuments(databaseId, collectionId, [
    Query.equal("userId", oldUserId),
    Query.limit(5000),
  ]);

  let totalLifetime = 0;
  for (const document of response.documents) {
    totalLifetime += Number(document.lifetimeTotal || 0);

    if (!apply) continue;

    const permissions = document["$permissions"]?.map(replacePermissionOwner);
    const data = { userId: newUserId };
    await databases.updateDocument(
      databaseId,
      collectionId,
      document["$id"],
      data,
      permissions,
    );
  }

  return {
    collectionId,
    count: response.documents.length,
    totalLifetime,
  };
}

async function migrateGoal() {
  const [oldResponse, newResponse] = await Promise.all([
    databases.listDocuments(databaseId, "tasbeeh_progress_goals", [Query.equal("userId", oldUserId), Query.limit(1)]),
    databases.listDocuments(databaseId, "tasbeeh_progress_goals", [Query.equal("userId", newUserId), Query.limit(1)]),
  ]);
  const oldGoal = oldResponse.documents[0];
  const newGoal = newResponse.documents[0];
  if (!oldGoal) return { collectionId: "tasbeeh_progress_goals", count: 0 };

  if (!apply) {
    return { collectionId: "tasbeeh_progress_goals", count: 1, sourceLifetimeTotal: oldGoal.lifetimeTotal };
  }

  const data = { ...oldGoal };
  delete data["$id"];
  delete data["$permissions"];
  delete data["$databaseId"];
  delete data["$collectionId"];
  delete data["$createdAt"];
  delete data["$updatedAt"];
  data.userId = newUserId;
  const permissions = oldGoal["$permissions"]?.map(replacePermissionOwner);

  if (newGoal) {
    await databases.updateDocument(databaseId, "tasbeeh_progress_goals", newGoal["$id"], data, permissions);
  } else {
    await databases.updateDocument(databaseId, "tasbeeh_progress_goals", oldGoal["$id"], data, permissions);
  }
  return { collectionId: "tasbeeh_progress_goals", count: 1, sourceLifetimeTotal: oldGoal.lifetimeTotal };
}

async function main() {
  const results = [];
  for (const collectionId of collections) {
    results.push(await migrateCollection(collectionId));
  }
  results.push(await migrateGoal());

  console.log(JSON.stringify({
    applied: apply,
    oldUserId,
    newUserId,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
