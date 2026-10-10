import AsyncStorage from "@react-native-async-storage/async-storage";

const ACTIVITY_KEY = "dalail_activity";
const LAST_ACTIVITY_KEY = "dalail_last_activity_at";
const ACTIVITY_WINDOW_DAYS = 14;
const INTEREST_READER_DAYS = 2;

export type DalailActivityType = "reader" | "list";

type DalailActivityDay = {
    reader: number;
    list: number;
};

type DalailActivityStore = Record<string, DalailActivityDay>;

export type DalailInterest = {
    readerDays: number;
    activityDays: number;
    interested: boolean;
};

function getDateKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getWindowStartKey(): string {
    return getDateKey(new Date(Date.now() - (ACTIVITY_WINDOW_DAYS - 1) * 86400000));
}

async function loadActivity(): Promise<DalailActivityStore> {
    try {
        const raw = await AsyncStorage.getItem(ACTIVITY_KEY);
        return raw ? (JSON.parse(raw) as DalailActivityStore) : {};
    } catch {
        return {};
    }
}

async function saveActivity(activity: DalailActivityStore): Promise<void> {
    await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
}

function daysInWindow(activity: DalailActivityStore, predicate: (day: DalailActivityDay) => boolean): number {
    const start = getWindowStartKey();
    const today = getDateKey();
    return Object.entries(activity)
        .filter(([key]) => key >= start && key <= today)
        .filter(([, day]) => predicate(day)).length;
}

export async function recordDalailActivity(type: DalailActivityType): Promise<void> {
    const activity = await loadActivity();
    const today = getDateKey();
    const day = activity[today] ?? { reader: 0, list: 0 };
    if (type === "reader") day.reader += 1;
    else day.list += 1;
    activity[today] = day;

    const start = getWindowStartKey();
    for (const key of Object.keys(activity)) {
        if (key < start) delete activity[key];
    }

    await saveActivity(activity);
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export async function getDalailInterest(): Promise<DalailInterest> {
    const activity = await loadActivity();
    const readerDays = daysInWindow(activity, (day) => day.reader > 0);
    const activityDays = daysInWindow(activity, (day) => day.reader > 0 || day.list > 0);
    const interested =
        readerDays >= INTEREST_READER_DAYS || (readerDays >= 1 && activityDays >= INTEREST_READER_DAYS);
    return { readerDays, activityDays, interested };
}

export async function getLastDalailActivityAt(): Promise<number | null> {
    try {
        const raw = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
        return raw ? Number(raw) : null;
    } catch {
        return null;
    }
}