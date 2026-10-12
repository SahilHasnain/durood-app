import { executeAuthenticatedAppwriteFunction } from "@/services/appwriteAuth";

const ADMIN_USERS_FUNCTION_ID = process.env.EXPO_PUBLIC_ADMIN_USERS_FUNCTION_ID || "admin-users";

export type AdminUserSummary = {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    status: boolean;
    emailVerified: boolean;
    lifetimeTotal: number;
    currentStreak: number;
    longestStreak: number;
    dailyTarget: number;
    totalGoal: number;
    todayCount: number;
    lastActiveDate: string | null;
};

export type AdminUserHistory = {
    date: string;
    count: number;
    target: number;
    sessionsCount: number;
};

export type AdminUserDetails = {
    user: Omit<AdminUserSummary, "lifetimeTotal" | "currentStreak" | "longestStreak" | "dailyTarget" | "totalGoal" | "todayCount" | "lastActiveDate">;
    goal: Pick<AdminUserSummary, "lifetimeTotal" | "currentStreak" | "longestStreak" | "dailyTarget" | "totalGoal">;
    history: AdminUserHistory[];
};

export type AdminUsersPage = {
    users: AdminUserSummary[];
    total: number;
    limit: number;
    offset: number;
};

export class AdminUsersApiError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = "AdminUsersApiError";
        this.statusCode = statusCode;
    }
}

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function executeAdminRequest<T>(body: Record<string, unknown>): Promise<T> {
    const execution = await executeAuthenticatedAppwriteFunction(ADMIN_USERS_FUNCTION_ID, body);
    let parsed: { error?: string } & Record<string, unknown>;
    try {
        parsed = JSON.parse(execution.responseBody || "{}") as { error?: string } & Record<string, unknown>;
    } catch {
        throw new AdminUsersApiError("The admin service returned an invalid response.", execution.responseStatusCode || 500);
    }
    if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
        throw new AdminUsersApiError(parsed.error || "The admin request was denied.", execution.responseStatusCode);
    }
    return parsed as T;
}

export function listAdminUsers(options: { limit: number; offset: number; search: string }): Promise<AdminUsersPage> {
    return executeAdminRequest<AdminUsersPage>({
        action: "listUsers",
        limit: options.limit,
        offset: options.offset,
        search: options.search.trim(),
        today: localDateKey(),
    });
}

export function getAdminUserDetails(userId: string): Promise<AdminUserDetails> {
    return executeAdminRequest<AdminUserDetails>({ action: "getUserDetails", userId });
}
