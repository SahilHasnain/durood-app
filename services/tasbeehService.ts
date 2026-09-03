import client, { config, databases } from "@/config/appwrite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Account, ID, Query } from "appwrite";

const TASBEEH_COLLECTION_ID = "tasbeeh_progress";
const USER_ID_KEY = "@user_id";

const account = new Account(client);

// Types
export interface DailyProgress {
  $id?: string;
  userId: string;
  date: string;
  count: number;
  target: number;
  sessions: SessionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  count: number;
  duration: number;
  goal?: number;
  startedAt: string;
  endedAt: string;
}

export interface UserGoal {
  $id?: string;
  userId: string;
  totalGoal: number;
  lifetimeTotal: number;
  currentStreak: number;
  longestStreak: number;
  dailyTarget: number;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
}

function parseStoredSessions(
  sessions: DailyProgress["sessions"] | string | undefined
): SessionRecord[] {
  if (!sessions) return [];
  if (Array.isArray(sessions)) return sessions;

  try {
    const parsed = JSON.parse(sessions);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Get user ID (authenticated or anonymous)
async function getUserId(authenticatedUserId?: string): Promise<string> {
  if (authenticatedUserId) {
    return authenticatedUserId;
  }

  try {
    // Try to get authenticated user first
    const user = await account.get();
    if (user?.$id) {
      return user.$id;
    }
  } catch {
    // User not authenticated, use anonymous ID
  }

  // Fall back to anonymous user ID
  let userId = await AsyncStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

// Get today's date key
function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

// Get yesterday's date key
function getYesterdayKey(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function getMonthStartKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function getMonthEndKey(): string {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(
    end.getDate()
  ).padStart(2, "0")}`;
}

// User Goal Operations
export async function getUserGoal(authenticatedUserId?: string): Promise<UserGoal | null> {
  try {
    const userId = await getUserId(authenticatedUserId);
    const response = await databases.listDocuments(
      config.databaseId,
      TASBEEH_COLLECTION_ID + "_goals",
      [Query.equal("userId", userId), Query.limit(1)]
    );

    if (response.documents.length > 0) {
      return response.documents[0] as unknown as UserGoal;
    }
    return null;
  } catch (error) {
    console.error("Failed to get user goal:", error);
    return null;
  }
}

export async function createOrUpdateUserGoal(data: Partial<UserGoal>, authenticatedUserId?: string): Promise<UserGoal | null> {
  try {
    const userId = await getUserId(authenticatedUserId);
    const existing = await getUserGoal(authenticatedUserId);

    const goalData = {
      userId,
      totalGoal: data.totalGoal ?? existing?.totalGoal ?? 10000000,
      lifetimeTotal: data.lifetimeTotal ?? existing?.lifetimeTotal ?? 0,
      currentStreak: data.currentStreak ?? existing?.currentStreak ?? 0,
      longestStreak: data.longestStreak ?? existing?.longestStreak ?? 0,
      dailyTarget: data.dailyTarget ?? existing?.dailyTarget ?? 100,
      targetDate: data.targetDate ?? existing?.targetDate,
      updatedAt: new Date().toISOString(),
    };

    if (existing?.$id) {
      const response = await databases.updateDocument(
        config.databaseId,
        TASBEEH_COLLECTION_ID + "_goals",
        existing.$id,
        goalData
      );
      return response as unknown as UserGoal;
    } else {
      const response = await databases.createDocument(
        config.databaseId,
        TASBEEH_COLLECTION_ID + "_goals",
        ID.unique(),
        {
          ...goalData,
          createdAt: new Date().toISOString(),
        }
      );
      return response as unknown as UserGoal;
    }
  } catch (error) {
    console.error("Failed to create/update user goal:", error);
    return null;
  }
}

// Daily Progress Operations
export async function getTodayProgress(authenticatedUserId?: string): Promise<DailyProgress | null> {
  try {
    const userId = await getUserId(authenticatedUserId);
    const today = getTodayKey();

    const response = await databases.listDocuments(
      config.databaseId,
      TASBEEH_COLLECTION_ID,
      [Query.equal("userId", userId), Query.equal("date", today), Query.limit(1)]
    );

    if (response.documents.length > 0) {
      const progress = response.documents[0] as unknown as DailyProgress & {
        sessions?: string | SessionRecord[];
      };

      return {
        ...progress,
        sessions: parseStoredSessions(progress.sessions),
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to get today's progress:", error);
    return null;
  }
}

export async function createOrUpdateDailyProgress(
  count: number,
  target: number,
  authenticatedUserId?: string,
  date: string = getTodayKey(),
  sessions?: SessionRecord[]
): Promise<DailyProgress | null> {
  try {
    const userId = await getUserId(authenticatedUserId);
    const existing = date === getTodayKey()
      ? await getTodayProgress(authenticatedUserId)
      : await getProgressByDate(date, authenticatedUserId);

    const progressData = {
      userId,
      date,
      count,
      target,
      sessions: JSON.stringify(sessions ?? existing?.sessions ?? []),
      updatedAt: new Date().toISOString(),
    };

    if (existing?.$id) {
      const response = await databases.updateDocument(
        config.databaseId,
        TASBEEH_COLLECTION_ID,
        existing.$id,
        progressData
      );
      return response as unknown as DailyProgress;
    } else {
      const response = await databases.createDocument(
        config.databaseId,
        TASBEEH_COLLECTION_ID,
        ID.unique(),
        {
          ...progressData,
          createdAt: new Date().toISOString(),
        }
      );
      return response as unknown as DailyProgress;
    }
  } catch (error) {
    console.error("Failed to create/update daily progress:", error);
    return null;
  }
}

export async function getProgressByDate(
  date: string,
  authenticatedUserId?: string
): Promise<DailyProgress | null> {
  try {
    const userId = await getUserId(authenticatedUserId);
    const response = await databases.listDocuments(
      config.databaseId,
      TASBEEH_COLLECTION_ID,
      [Query.equal("userId", userId), Query.equal("date", date), Query.limit(1)]
    );

    if (response.documents.length > 0) {
      const progress = response.documents[0] as unknown as DailyProgress & {
        sessions?: string | SessionRecord[];
      };

      return {
        ...progress,
        sessions: parseStoredSessions(progress.sessions),
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to get progress by date:", error);
    return null;
  }
}

export async function getDailyHistory(days: number = 30, authenticatedUserId?: string): Promise<DailyProgress[]> {
  try {
    const userId = await getUserId(authenticatedUserId);
    const response = await databases.listDocuments(
      config.databaseId,
      TASBEEH_COLLECTION_ID,
      [
        Query.equal("userId", userId),
        Query.orderDesc("date"),
        Query.limit(days),
      ]
    );

    return (response.documents as unknown as (
      DailyProgress & { sessions?: string | SessionRecord[] }
    )[]).map((progress) => ({
      ...progress,
      sessions: parseStoredSessions(progress.sessions),
    }));
  } catch (error) {
    console.error("Failed to get daily history:", error);
    return [];
  }
}

export async function getCurrentMonthHistory(authenticatedUserId?: string): Promise<DailyProgress[]> {
  try {
    const userId = await getUserId(authenticatedUserId);
    const response = await databases.listDocuments(
      config.databaseId,
      TASBEEH_COLLECTION_ID,
      [
        Query.equal("userId", userId),
        Query.greaterThanEqual("date", getMonthStartKey()),
        Query.lessThanEqual("date", getMonthEndKey()),
        Query.orderDesc("date"),
        Query.limit(31),
      ]
    );

    return (response.documents as unknown as (
      DailyProgress & { sessions?: string | SessionRecord[] }
    )[]).map((progress) => ({
      ...progress,
      sessions: parseStoredSessions(progress.sessions),
    }));
  } catch (error) {
    console.error("Failed to get current month history:", error);
    return [];
  }
}

// Sync Operations
export async function syncFromLocalStorage(authenticatedUserId?: string): Promise<void> {
  try {
    // Get local data
    const [
      lifetimeStr,
      streakStr,
      todayCountStr,
      todayTargetStr,
      historyStr,
      lastActiveDate,
    ] = await Promise.all([
      AsyncStorage.getItem("tasbeeh_lifetime_total"),
      AsyncStorage.getItem("tasbeeh_streak"),
      AsyncStorage.getItem("tasbeeh_count"),
      AsyncStorage.getItem("tasbeeh_target"),
      AsyncStorage.getItem("tasbeeh_daily_history"),
      AsyncStorage.getItem("tasbeeh_last_active_date"),
    ]);

    const lifetimeTotal = lifetimeStr ? parseInt(lifetimeStr, 10) : 0;
    const currentStreak = streakStr ? parseInt(streakStr, 10) : 0;
    const todayCount = lastActiveDate === getTodayKey() && todayCountStr ? parseInt(todayCountStr, 10) : 0;
    const todayTarget = todayTargetStr ? parseInt(todayTargetStr, 10) : 100;

    // Sync user goal
    await createOrUpdateUserGoal({
      lifetimeTotal,
      currentStreak,
      longestStreak: currentStreak,
      dailyTarget: todayTarget,
    }, authenticatedUserId);

    // Sync today's progress
    await createOrUpdateDailyProgress(todayCount, todayTarget, authenticatedUserId);

    // Sync history if available
    if (historyStr) {
      const history: { date: string; count: number; target: number }[] =
        JSON.parse(historyStr);

      for (const record of history) {
        await createOrUpdateDailyProgress(
          record.count,
          record.target,
          authenticatedUserId,
          record.date
        );
      }
    }

    console.log("Successfully synced local data to Appwrite");
  } catch (error) {
    console.error("Failed to sync from local storage:", error);
  }
}

// Calculate streak from history
export async function calculateStreak(authenticatedUserId?: string): Promise<{
  currentStreak: number;
  longestStreak: number;
}> {
  try {
    const history = await getDailyHistory(365, authenticatedUserId);
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    // Filter days with progress and sort by date descending (newest first)
    const daysWithProgress = history
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (daysWithProgress.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Check if streak is still active (today or yesterday has progress)
    const mostRecentDay = daysWithProgress[0].date;
    const streakIsActive = mostRecentDay === today || mostRecentDay === yesterday;

    if (!streakIsActive) {
      // Streak is broken, but calculate longest streak from history
      let longestStreak = 0;
      let currentRun = 1;

      for (let i = 1; i < daysWithProgress.length; i++) {
        const prevDate = daysWithProgress[i - 1].date;
        const currDate = daysWithProgress[i].date;
        
        // Check if current date is exactly 1 day before previous date
        if (currDate === getDateBefore(prevDate, 1)) {
          currentRun++;
        } else {
          longestStreak = Math.max(longestStreak, currentRun);
          currentRun = 1;
        }
      }
      longestStreak = Math.max(longestStreak, currentRun);

      return { currentStreak: 0, longestStreak };
    }

    // Calculate current streak (from most recent day backwards)
    let currentStreak = 1;
    for (let i = 1; i < daysWithProgress.length; i++) {
      const prevDate = daysWithProgress[i - 1].date;
      const currDate = daysWithProgress[i].date;
      
      // Check if current date is exactly 1 day before previous date
      if (currDate === getDateBefore(prevDate, 1)) {
        currentStreak++;
      } else {
        break; // Streak is broken
      }
    }

    // Calculate longest streak
    let longestStreak = currentStreak;
    let currentRun = 1;

    for (let i = 1; i < daysWithProgress.length; i++) {
      const prevDate = daysWithProgress[i - 1].date;
      const currDate = daysWithProgress[i].date;
      
      if (currDate === getDateBefore(prevDate, 1)) {
        currentRun++;
        longestStreak = Math.max(longestStreak, currentRun);
      } else {
        currentRun = 1;
      }
    }

    return { currentStreak, longestStreak };
  } catch (error) {
    console.error("Failed to calculate streak:", error);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

function getDateBefore(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}
