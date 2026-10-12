import { Account, Client, Databases, Query, Users } from "node-appwrite";

const ADMIN_LABEL = "admin";
const PAGE_SIZE_MAX = 50;
const HISTORY_DAYS_MAX = 60;

function respond(res, statusCode, body) {
  return res.json(body, statusCode);
}

function getUserJwt(req) {
  return req.headers?.["x-appwrite-user-jwt"] ?? req.headers?.["X-Appwrite-User-Jwt"] ?? "";
}

function parsePayload(req) {
  if (req.bodyJson && typeof req.bodyJson === "object") return req.bodyJson;
  try {
    return JSON.parse(req.body || "{}");
  } catch {
    return null;
  }
}

function parseSessions(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toSafeUser(user) {
  return {
    id: user.$id,
    name: user.name || "Unnamed user",
    email: user.email || "",
    createdAt: user.$createdAt,
    status: Boolean(user.status),
    emailVerified: Boolean(user.emailVerification),
  };
}

function toSafeGoal(goal) {
  if (!goal) {
    return {
      lifetimeTotal: 0,
      currentStreak: 0,
      longestStreak: 0,
      dailyTarget: 100,
      totalGoal: 10000000,
    };
  }
  return {
    lifetimeTotal: Number(goal.lifetimeTotal) || 0,
    currentStreak: Number(goal.currentStreak) || 0,
    longestStreak: Number(goal.longestStreak) || 0,
    dailyTarget: Number(goal.dailyTarget) || 100,
    totalGoal: Number(goal.totalGoal) || 10000000,
  };
}

async function getAdminCaller(jwt, endpoint, projectId) {
  if (!jwt) return { error: "Authentication required.", status: 401 };
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
  try {
    const caller = await new Account(client).get();
    if (!Array.isArray(caller.labels) || !caller.labels.includes(ADMIN_LABEL)) {
      return { error: "Admin role required.", status: 403 };
    }
    return { caller };
  } catch {
    return { error: "Authentication required.", status: 401 };
  }
}

export default async ({ req, res, log, error }) => {
  if (req.method !== "POST") {
    return respond(res, 405, { error: "Only POST is supported." });
  }

  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = req.headers?.["x-appwrite-key"] ?? "";
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const progressCollectionId = process.env.APPWRITE_PROGRESS_COLLECTION_ID || "tasbeeh_progress";
  const goalsCollectionId = process.env.APPWRITE_GOALS_COLLECTION_ID || "tasbeeh_progress_goals";

  if (!endpoint || !projectId || !apiKey || !databaseId) {
    return respond(res, 500, { error: "Admin function configuration is incomplete." });
  }

  const auth = await getAdminCaller(getUserJwt(req), endpoint, projectId);
  if (auth.error) return respond(res, auth.status, { error: auth.error });

  const payload = parsePayload(req);
  if (!payload || typeof payload.action !== "string") {
    return respond(res, 400, { error: "A valid action is required." });
  }

  const adminClient = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const users = new Users(adminClient);
  const databases = new Databases(adminClient);

  try {
    if (payload.action === "listUsers") {
      const requestedLimit = Number(payload.limit);
      const requestedOffset = Number(payload.offset);
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), PAGE_SIZE_MAX) : 25;
      const offset = Number.isInteger(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
      const search = typeof payload.search === "string" ? payload.search.trim().slice(0, 100) : "";
      const today = typeof payload.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.today)
        ? payload.today
        : "";

      const userResponse = await users.list({
        queries: [Query.limit(limit), Query.offset(offset)],
        ...(search ? { search } : {}),
      });
      const userIds = userResponse.users.map((user) => user.$id);
      if (!userIds.length) {
        return respond(res, 200, { users: [], total: userResponse.total, limit, offset });
      }

      const [goalResponse, todayResponse] = await Promise.all([
        databases.listDocuments(databaseId, goalsCollectionId, [
          Query.equal("userId", userIds),
          Query.limit(PAGE_SIZE_MAX),
        ]),
        today
          ? databases.listDocuments(databaseId, progressCollectionId, [
            Query.equal("userId", userIds),
            Query.equal("date", today),
            Query.limit(PAGE_SIZE_MAX),
          ])
          : Promise.resolve({ documents: [] }),
      ]);

      const goalsByUser = new Map(goalResponse.documents.map((goal) => [goal.userId, goal]));
      const todayByUser = new Map(todayResponse.documents.map((progress) => [progress.userId, progress]));
      const rows = userResponse.users.map((user) => {
        const todayProgress = todayByUser.get(user.$id);
        return {
          ...toSafeUser(user),
          ...toSafeGoal(goalsByUser.get(user.$id)),
          todayCount: Number(todayProgress?.count) || 0,
          lastActiveDate: typeof todayProgress?.date === "string" ? todayProgress.date : null,
        };
      });

      return respond(res, 200, {
        users: rows,
        total: userResponse.total,
        limit,
        offset,
      });
    }

    if (payload.action === "getUserDetails") {
      const userId = typeof payload.userId === "string" ? payload.userId.trim() : "";
      if (!userId || userId.length > 36) return respond(res, 400, { error: "A valid user ID is required." });

      let user;
      try {
        user = await users.get(userId);
      } catch (lookupError) {
        if (lookupError?.code === 404) return respond(res, 404, { error: "User not found." });
        throw lookupError;
      }

      const [goalResponse, progressResponse] = await Promise.all([
        databases.listDocuments(databaseId, goalsCollectionId, [
          Query.equal("userId", userId),
          Query.limit(1),
        ]),
        databases.listDocuments(databaseId, progressCollectionId, [
          Query.equal("userId", userId),
          Query.orderDesc("date"),
          Query.limit(HISTORY_DAYS_MAX),
        ]),
      ]);

      const history = progressResponse.documents.map((progress) => ({
        date: String(progress.date ?? ""),
        count: Number(progress.count) || 0,
        target: Number(progress.target) || 100,
        sessionsCount: parseSessions(progress.sessions).length,
      }));

      return respond(res, 200, {
        user: toSafeUser(user),
        goal: toSafeGoal(goalResponse.documents[0]),
        history,
      });
    }

    return respond(res, 400, { error: "Unknown admin action." });
  } catch (err) {
    error(`Admin users function failed: ${err?.message ?? "Unknown error"}`);
    log(`Admin caller ${auth.caller.$id} requested ${payload.action}`);
    return respond(res, 500, { error: "Could not load user data." });
  }
};
