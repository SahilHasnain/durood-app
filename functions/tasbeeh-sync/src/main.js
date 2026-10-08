import { Client, Databases, ID, Query } from "node-appwrite";

const databaseId = process.env.APPWRITE_DATABASE_ID;
const progressCollectionId = process.env.APPWRITE_PROGRESS_COLLECTION_ID || "tasbeeh_progress";
const goalsCollectionId = process.env.APPWRITE_GOALS_COLLECTION_ID || "tasbeeh_progress_goals";
const eventsCollectionId = process.env.APPWRITE_EVENTS_COLLECTION_ID;
const globalStatsCollectionId = process.env.APPWRITE_GLOBAL_STATS_COLLECTION_ID || "global_stats";
const globalStatsDocumentId = "authenticated_total";

function response(res, statusCode, body) {
  return res.json(body, statusCode);
}

function getUserId(req) {
  return req.headers["x-appwrite-user-id"];
}

function normalizeCityId(city, country) {
  const slug = (value) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug(country)}:${slug(city)}`;
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
  const userId = getUserId(req);

  if (!userId || userId.startsWith("anon_")) {
    return response(res, 401, { error: "An authenticated Appwrite user is required." });
  }

  if (!new Set(["migration", "city-leaderboard"]).has(payload.type) &&
    (!eventId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(amount) || amount <= 0)) {
    return response(res, 400, { error: "eventId, userId, date, and positive integer amount are required." });
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const databases = new Databases(client);

  if (payload.type === "city-leaderboard") {
    const goalsCollectionId = process.env.APPWRITE_GOALS_COLLECTION_ID || "tasbeeh_progress_goals";
    const userGoals = await databases.listDocuments(databaseId, goalsCollectionId, [
      Query.equal("userId", userId),
      Query.limit(1),
    ]);
    const ownGoal = userGoals.documents[0];

    if (payload.action === "join") {
      const city = typeof payload.city === "string" ? payload.city.trim() : "";
      const country = typeof payload.country === "string" ? payload.country.trim() : "";
      if (!city || !country || city.length > 80 || country.length > 80) {
        return response(res, 400, { error: "A valid city and country are required." });
      }

      const cityId = normalizeCityId(city, country);
      const displayName = typeof payload.displayName === "string"
        ? payload.displayName.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 40)
        : "";
      const membership = {
        cityId,
        cityName: city,
        country,
        displayName: displayName || "Community member",
        updatedAt: new Date().toISOString(),
      };

      if (ownGoal) {
        await databases.updateDocument(databaseId, goalsCollectionId, ownGoal.$id, membership);
      } else {
        await databases.createDocument(databaseId, goalsCollectionId, ID.unique(), {
          userId,
          totalGoal: 10000000,
          lifetimeTotal: 0,
          currentStreak: 0,
          longestStreak: 0,
          dailyTarget: 100,
          ...membership,
          createdAt: new Date().toISOString(),
        });
      }
      return response(res, 200, { accepted: true, cityId, city, country });
    }

    if (payload.action === "leave") {
      if (ownGoal) {
        await databases.updateDocument(databaseId, goalsCollectionId, ownGoal.$id, {
          cityId: "",
          cityName: "",
          country: "",
          displayName: "",
          updatedAt: new Date().toISOString(),
        });
      }
      return response(res, 200, { accepted: true, optedIn: false });
    }

    if (payload.action === "list") {
      if (!ownGoal?.cityId) {
        return response(res, 200, { accepted: true, optedIn: false, city: null, entries: [] });
      }
      const cityGoals = await databases.listDocuments(databaseId, goalsCollectionId, [
        Query.equal("cityId", ownGoal.cityId),
        Query.orderDesc("lifetimeTotal"),
        Query.limit(100),
      ]);
      const entries = cityGoals.documents
        .filter((goal) => goal.cityId === ownGoal.cityId)
        .map((goal, index) => ({
          rank: index + 1,
          displayName: goal.displayName || "Community member",
          lifetimeTotal: goal.lifetimeTotal || 0,
          isYou: goal.userId === userId,
        }));
      const ownEntry = entries.find((entry) => entry.isYou);
      const yourRank = ownEntry?.rank ?? (await databases.listDocuments(databaseId, goalsCollectionId, [
        Query.equal("cityId", ownGoal.cityId),
        Query.greaterThan("lifetimeTotal", ownGoal.lifetimeTotal || 0),
        Query.limit(1),
      ])).total + 1;
      return response(res, 200, {
        accepted: true,
        optedIn: true,
        city: { cityId: ownGoal.cityId, cityName: ownGoal.cityName, country: ownGoal.country },
        yourRank,
        entries,
      });
    }

    return response(res, 400, { error: "Unknown city leaderboard action." });
  }

  if (payload.type === "migration") {
    const records = Array.isArray(payload.records) ? payload.records : [];
    if (records.length > 365 || records.some((record) =>
      typeof record.eventId !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
      !Number.isInteger(record.amount) || record.amount <= 0 ||
      !Number.isInteger(record.target) || record.target <= 0
    )) {
      return response(res, 400, { error: "Invalid migration records." });
    }

    for (const record of records) {
      try {
        await databases.createDocument(databaseId, eventsCollectionId, record.eventId, {
          eventId: record.eventId,
          userId,
          date: record.date,
          amount: record.amount,
          sessionId: "",
          createdAt: new Date().toISOString(),
        });
      } catch (eventError) {
        if (eventError?.code === 409) continue;
        throw eventError;
      }

      const progressResponse = await databases.listDocuments(databaseId, progressCollectionId, [
        Query.equal("userId", userId), Query.equal("date", record.date), Query.limit(1),
      ]);
      const progress = progressResponse.documents[0];
      if (progress) {
        await databases.incrementDocumentAttribute(databaseId, progressCollectionId, progress.$id, "count", record.amount);
      } else {
        await databases.createDocument(databaseId, progressCollectionId, ID.unique(), {
          userId, date: record.date, count: record.amount, target: record.target,
          sessions: "[]", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
      }

      const goalResponse = await databases.listDocuments(databaseId, goalsCollectionId, [
        Query.equal("userId", userId), Query.limit(1),
      ]);
      const goal = goalResponse.documents[0];
      if (goal) {
        await databases.incrementDocumentAttribute(databaseId, goalsCollectionId, goal.$id, "lifetimeTotal", record.amount);
      } else {
        await databases.createDocument(databaseId, goalsCollectionId, ID.unique(), {
          userId, totalGoal: 10000000, lifetimeTotal: record.amount, currentStreak: 1,
          longestStreak: 1, dailyTarget: record.target, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
      }

      await databases.incrementDocumentAttribute(databaseId, globalStatsCollectionId, globalStatsDocumentId, "totalRecitations", record.amount);
    }

    return response(res, 200, { accepted: true, migrationId: payload.migrationId || null, records: records.length });
  }

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

    // Anonymous local progress is deliberately excluded from the community total.
    if (!userId.startsWith("anon_")) {
      await databases.incrementDocumentAttribute(
        databaseId,
        globalStatsCollectionId,
        globalStatsDocumentId,
        "totalRecitations",
        amount,
      );
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
