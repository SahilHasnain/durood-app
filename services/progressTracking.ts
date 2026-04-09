import AsyncStorage from "@react-native-async-storage/async-storage";

const PROGRESS_KEY_PREFIX = "@durood_progress_";

interface ProgressData {
  progress: number;
  duration: number;
  lastUpdated: number;
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
