import client from "@/config/appwrite";
import { Functions } from "appwrite";

const SYNC_FUNCTION_ID = "tasbeeh-sync";
const functions = new Functions(client);

export interface CityLeaderboardEntry {
    rank: number;
    userId: string;
    displayName: string;
    lifetimeTotal: number;
    isYou: boolean;
}

export interface CityLeaderboard {
    optedIn: boolean;
    city: { cityId: string; cityName: string; country: string } | null;
    yourRank?: number;
    entries: CityLeaderboardEntry[];
}

async function executeCityAction<T>(action: string, details: Record<string, unknown> = {}): Promise<T> {
    const execution = await functions.createExecution(
        SYNC_FUNCTION_ID,
        JSON.stringify({ type: "city-leaderboard", action, ...details }),
        false,
    );

    if (execution.responseStatusCode !== 200 || !execution.responseBody) {
        throw new Error(`City leaderboard request failed (${execution.responseStatusCode}).`);
    }

    const response = JSON.parse(execution.responseBody);
    if (response?.accepted !== true) {
        throw new Error(response?.error || "City leaderboard request failed.");
    }
    return response as T;
}

export function joinCityLeaderboard(city: string, country: string, displayName: string) {
    return executeCityAction<{ accepted: true; cityId: string; city: string; country: string }>("join", { city, country, displayName });
}

export function leaveCityLeaderboard() {
    return executeCityAction<{ accepted: true; optedIn: false }>("leave");
}

export function getCityLeaderboard() {
    return executeCityAction<CityLeaderboard>("list");
}
