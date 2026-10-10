import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "notification_settings";
export const DEFAULT_REMINDER_HOUR = 20;
export const DEFAULT_REMINDER_MINUTE = 0;

export type NotificationSettings = {
    streakEnabled: boolean;
    streakHour: number;
    streakMinute: number;
    dalailEnabled: boolean;
    dalailHour: number;
    dalailMinute: number;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    streakEnabled: true,
    streakHour: DEFAULT_REMINDER_HOUR,
    streakMinute: DEFAULT_REMINDER_MINUTE,
    dalailEnabled: true,
    dalailHour: DEFAULT_REMINDER_HOUR,
    dalailMinute: DEFAULT_REMINDER_MINUTE,
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
    try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
        const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
        return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
    } catch {
        return DEFAULT_NOTIFICATION_SETTINGS;
    }
}

export async function updateNotificationSettings(partial: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const current = await getNotificationSettings();
    const next = { ...current, ...partial };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
}