import AsyncStorage from "@react-native-async-storage/async-storage";

const PROGRESS_KEY_PREFIX = "@durood_progress_";
const WATCHED_VIDEOS_KEY = "@durood_recent_watched_videos";
const MAX_WATCHED_VIDEOS = 100;

interface ProgressData {
  progress: number;
  duration: number;
  lastUpdated: number;
}

interface WatchedVideo {
  id: string;
  watchedAt: number;
}

export async function saveProgress(
  duroodId: string,
  progress: number,
  duration: number
): Promise<void> {
  try {
    const data: ProgressData = {
      progress,
      duration,
      lastUpdated: Date.now(),
    };
    await AsyncStorage.setItem(
      `${PROGRESS_KEY_PREFIX}${duroodId}`,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error("Failed to save progress:", error);
  }
}

export async function getProgress(
  duroodId: string
): Promise<ProgressData | null> {
  try {
    const stored = await AsyncStorage.getItem(`${PROGRESS_KEY_PREFIX}${duroodId}`);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error("Failed to get progress:", error);
    return null;
  }
}

export async function markVideoWatched(duroodId: string): Promise<void> {
  try {
    const watchedVideos = await getRecentlyWatchedVideos();
    const nextWatchedVideos = [
      { id: duroodId, watchedAt: Date.now() },
      ...watchedVideos.filter((video) => video.id !== duroodId),
    ].slice(0, MAX_WATCHED_VIDEOS);

    await AsyncStorage.setItem(WATCHED_VIDEOS_KEY, JSON.stringify(nextWatchedVideos));
  } catch (error) {
    console.error("Failed to mark video watched:", error);
  }
}

export async function getRecentlyWatchedVideoIds(): Promise<string[]> {
  const watchedVideos = await getRecentlyWatchedVideos();
  return watchedVideos.map((video) => video.id);
}

async function getRecentlyWatchedVideos(): Promise<WatchedVideo[]> {
  try {
    const stored = await AsyncStorage.getItem(WATCHED_VIDEOS_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as WatchedVideo[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((video) => typeof video.id === "string" && typeof video.watchedAt === "number")
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, MAX_WATCHED_VIDEOS);
  } catch (error) {
    console.error("Failed to get watched videos:", error);
    return [];
  }
}
