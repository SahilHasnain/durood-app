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

// Get user ID (authenticated or anonymous)
async function getUserId(): Promise<string> {
  try {
    // Try to get authenticated user first
    const user = await account.get();
    if (user?.$id) {
      return user.$id;
    }
  } catch (error) {
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

// User Goal Operations
export async function getUserGoal(): Promise<UserGoal | null> {
  try {
    const userId = await getUserId();
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

export async function createOrUpdateUserGoal(data: Partial<UserGoal>): Promise<UserGoal | null> {
  try {
    const userId = await getUserId();
    const existing = await getUserGoal();

    const goalData = {
      userId,
      totalGoal: data.totalGoal ?? 10000000,
      lifetimeTotal: data.lifetimeTotal ?? 0,
      currentStreak: data.currentStreak ?? 0,
      longestStreak: data.longestStreak ?? 0,
      dailyTarget: data.dailyTarget ?? 100,
      targetDate: data.targetDate,
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
export async function getTodayProgress(): Promise<DailyProgress | null> {
  try {
    const userId = await getUserId();
    const today = getTodayKey();

    const response = await databases.listDocuments(
      config.databaseId,
      TASBEEH_COLLECTION_ID,
      [Query.equal("userId", userId), Query.equal("date", today), Query.limit(1)]
    );

    if (response.documents.length > 0) {
      return response.documents[0] as unknown as DailyProgress;
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
  sessions: SessionRecord[] = []
): Promise<DailyProgress | null> {
  try {
    const userId = await getUserId();
    const today = getTodayKey();
    const existing = await getTodayProgress();

    const progressData = {
      userId,
      date: today,
      count,
      target,
      sessions: JSON.stringify(sessions),
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

export async function getDailyHistory(days: number = 30): Promise<DailyProgress[]> {
  try {
    const userId = await getUserId();
    const response = await databases.listDocuments(
      config.databaseId,
      TASBEEH_COLLECTION_ID,
      [
        Query.equal("userId", userId),
        Query.orderDesc("date"),
        Query.limit(days),
      ]
    );

    return response.documents as unknown as DailyProgress[];
  } catch (error) {
    console.error("Failed to get daily history:", error);
    return [];
  }
}

// Sync Operations
export async function syncFromLocalStorage(): Promise<void> {
  try {
    // Get local data
    const [
      lifetimeStr,
      streakStr,
      todayCountStr,
      todayTargetStr,
      historyStr,
    ] = await Promise.all([
      AsyncStorage.getItem("tasbeeh_lifetime_total"),
      AsyncStorage.getItem("tasbeeh_streak"),
      AsyncStorage.getItem("tasbeeh_count"),
      AsyncStorage.getItem("tasbeeh_target"),
      AsyncStorage.getItem("tasbeeh_daily_history"),
    ]);

    const lifetimeTotal = lifetimeStr ? parseInt(lifetimeStr, 10) : 0;
    const currentStreak = streakStr ? parseInt(streakStr, 10) : 0;
    const todayCount = todayCountStr ? parseInt(todayCountStr, 10) : 0;
    const todayTarget = todayTargetStr ? parseInt(todayTargetStr, 10) : 100;

    // Sync user goal
    await createOrUpdateUserGoal({
      lifetimeTotal,
      currentStreak,
      longestStreak: currentStreak,
      dailyTarget: todayTarget,
    });

    // Sync today's progress
    await createOrUpdateDailyProgress(todayCount, todayTarget);

    // Sync history if available
    if (historyStr) {
      const history: Array<{ date: string; count: number; target: number }> =
        JSON.parse(historyStr);

      for (const record of history) {
        const userId = await getUserId();
        const existing = await databases.listDocuments(
          config.databaseId,
          TASBEEH_COLLECTION_ID,
          [
            Query.equal("userId", userId),
            Query.equal("date", record.date),
            Query.limit(1),
          ]
        );

        if (existing.documents.length === 0) {
          await databases.createDocument(
            config.databaseId,
            TASBEEH_COLLECTION_ID,
            ID.unique(),
            {
              userId,
              date: record.date,
              count: record.count,
              target: record.target,
              sessions: JSON.stringify([]),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          );
        }
      }
    }

    console.log("Successfully synced local data to Appwrite");
  } catch (error) {
    console.error("Failed to sync from local storage:", error);
  }
}

// Calculate streak from history
export async function calculateStreak(): Promise<{
  currentStreak: number;
  longestStreak: number;
}> {
  try {
    const history = await getDailyHistory(365);
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Sort by date descending
    const sorted = history.sort((a, b) => b.date.localeCompare(a.date));

    // Check if today or yesterday has progress
    const hasRecentProgress =
      sorted.length > 0 &&
      (sorted[0].date === today || sorted[0].date === yesterday) &&
      sorted[0].count > 0;

    if (!hasRecentProgress) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Calculate streaks
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].count > 0) {
        tempStreak++;
        if (i === 0 || sorted[i - 1].date === getDateBefore(sorted[i].date, 1)) {
          currentStreak = tempStreak;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    return { currentStreak, longestStreak };
  } catch (error) {
    console.error("Failed to calculate streak:", error);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

function getDateBefore(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}
