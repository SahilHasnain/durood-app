import { Client, Databases, ID, Query } from "node-appwrite";

const databaseId = process.env.APPWRITE_DATABASE_ID;
const progressCollectionId = process.env.APPWRITE_PROGRESS_COLLECTION_ID || "tasbeeh_progress";
const goalsCollectionId = process.env.APPWRITE_GOALS_COLLECTION_ID || "tasbeeh_progress_goals";
const eventsCollectionId = process.env.APPWRITE_EVENTS_COLLECTION_ID;

function response(res, statusCode, body) {
  return res.json(body, statusCode);
}

function getUserId(req, payload) {
  return req.headers["x-appwrite-user-id"] || payload.userId;
}

export default async ({ req, res, log, error }) => {
  if (req.method !== "POST") {
    return response(res, 405, { error: "Only POST is supported." });
  }

  if (!databaseId || !eventsCollectionId) {
    return response(res, 500, { error: "Function database configuration is missing." });
  }

  let payload;
  try {
    payload = typeof req.bodyJson === "object" ? req.bodyJson : JSON.parse(req.body || "{}");
  } catch {
    return response(res, 400, { error: "Request body must be valid JSON." });
  }

  const eventId = typeof payload.eventId === "string" ? payload.eventId : "";
  const date = typeof payload.date === "string" ? payload.date : "";
  const amount = Number(payload.amount);
  const userId = getUserId(req, payload);

  if (!eventId || !userId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(amount) || amount <= 0) {
    return response(res, 400, { error: "eventId, userId, date, and positive integer amount are required." });
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const databases = new Databases(client);
  let eventCreated = false;

  try {
    // The event document ID makes retries idempotent.
    try {
      await databases.createDocument(databaseId, eventsCollectionId, eventId, {
        eventId,
        userId,
        date,
        amount,
        sessionId: typeof payload.sessionId === "string" ? payload.sessionId : "",
        createdAt: new Date().toISOString(),
      });
      eventCreated = true;
    } catch (eventError) {
      if (eventError?.code === 409) {
        return response(res, 200, { accepted: true, duplicate: true, eventId });
      }
      throw eventError;
    }

    const progressResponse = await databases.listDocuments(databaseId, progressCollectionId, [
      Query.equal("userId", userId),
      Query.equal("date", date),
      Query.limit(1),
    ]);
    const progress = progressResponse.documents[0];

    if (progress) {
      await databases.incrementDocumentAttribute(
        databaseId,
        progressCollectionId,
        progress.$id,
        "count",
        amount,
      );
    } else {
      await databases.createDocument(databaseId, progressCollectionId, ID.unique(), {
        userId,
        date,
        count: amount,
        target: Number(payload.target) || 100,
        sessions: "[]",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const goalResponse = await databases.listDocuments(databaseId, goalsCollectionId, [
      Query.equal("userId", userId),
      Query.limit(1),
    ]);
    const goal = goalResponse.documents[0];

    if (goal) {
      await databases.incrementDocumentAttribute(
        databaseId,
        goalsCollectionId,
        goal.$id,
        "lifetimeTotal",
        amount,
      );
    } else {
      await databases.createDocument(databaseId, goalsCollectionId, ID.unique(), {
        userId,
        totalGoal: 10000000,
        lifetimeTotal: amount,
        currentStreak: 1,
        longestStreak: 1,
        dailyTarget: Number(payload.target) || 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    log(`Applied tasbeeh event ${eventId} for ${userId}: +${amount}`);
    return response(res, 200, { accepted: true, duplicate: false, eventId });
  } catch (err) {
    if (eventCreated) {
      try {
        await databases.deleteDocument(databaseId, eventsCollectionId, eventId);
      } catch {
        // Keep the original error. A later reconciliation can inspect this event.
      }
    }
    error(`Failed to apply tasbeeh event ${eventId}: ${err.message}`);
    return response(res, 500, { error: "Event was not applied." });
  }
};
