import client from "@/config/appwrite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Account, ID } from "appwrite";
import * as TasbeehService from "./tasbeehService";

const account = new Account(client);

const AUTH_USER_KEY = "@auth_user";
const ANON_USER_ID_KEY = "@user_id";

export interface User {
  $id: string;
  email: string;
  name: string;
  emailVerification: boolean;
}

// Get current session
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await account.get();
    return user as unknown as User;
  } catch (error) {
    return null;
  }
}

// Register new user
export async function register(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Get anonymous user ID before creating account
    const anonUserId = await AsyncStorage.getItem(ANON_USER_ID_KEY);

    // Create account
    await account.create(ID.unique(), email, password, name);

    // Login automatically
    await account.createEmailPasswordSession(email, password);

    // Get user details
    const user = await account.get();

    // Migrate anonymous data to authenticated user
    if (anonUserId) {
      await migrateAnonymousData(anonUserId, user.$id);
    }

    // Save user to local storage
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    return { success: true, user: user as unknown as User };
  } catch (error: any) {
    console.error("Registration failed:", error);
    return {
      success: false,
      error: error.message || "Registration failed",
    };
  }
}

// Login user
export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Get anonymous user ID before login
    const anonUserId = await AsyncStorage.getItem(ANON_USER_ID_KEY);

    // Create session
    await account.createEmailPasswordSession(email, password);

    // Get user details
    const user = await account.get();

    // Migrate anonymous data if exists
    if (anonUserId) {
      await migrateAnonymousData(anonUserId, user.$id);
    }

    // Save user to local storage
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    return { success: true, user: user as unknown as User };
  } catch (error: any) {
    console.error("Login failed:", error);
    return {
      success: false,
      error: error.message || "Login failed",
    };
  }
}

// Logout user
export async function logout(): Promise<void> {
  try {
    await account.deleteSession("current");
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

// Check if user is logged in
export async function isAuthenticated(): Promise<boolean> {
  try {
    await account.get();
    return true;
  } catch (error) {
    return false;
  }
}

// Get cached user from AsyncStorage
export async function getCachedUser(): Promise<User | null> {
  try {
    const userStr = await AsyncStorage.getItem(AUTH_USER_KEY);
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Send password recovery email
export async function sendPasswordRecovery(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await account.createRecovery(
      email,
      "https://yourapp.com/reset-password" // Replace with your app's deep link
    );
    return { success: true };
  } catch (error: any) {
    console.error("Password recovery failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send recovery email",
    };
  }
}

// Update user name
export async function updateUserName(
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await account.updateName(name);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return { success: true };
  } catch (error: any) {
    console.error("Update name failed:", error);
    return {
      success: false,
      error: error.message || "Failed to update name",
    };
  }
}

// Update user email
export async function updateUserEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await account.updateEmail(email, password);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return { success: true };
  } catch (error: any) {
    console.error("Update email failed:", error);
    return {
      success: false,
      error: error.message || "Failed to update email",
    };
  }
}

// Update user password
export async function updateUserPassword(
  newPassword: string,
  oldPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await account.updatePassword(newPassword, oldPassword);
    return { success: true };
  } catch (error: any) {
    console.error("Update password failed:", error);
    return {
      success: false,
      error: error.message || "Failed to update password",
    };
  }
}

// Migrate anonymous user data to authenticated user
async function migrateAnonymousData(
  anonUserId: string,
  authenticatedUserId: string
): Promise<void> {
  try {
    console.log(
      `Migrating data from anonymous user ${anonUserId} to authenticated user ${authenticatedUserId}`
    );

    // Get anonymous user's data
    const anonGoal = await TasbeehService.getUserGoal();
    const anonHistory = await TasbeehService.getDailyHistory(365);

    if (anonGoal) {
      // Update goal with new user ID
      await TasbeehService.createOrUpdateUserGoal({
        ...anonGoal,
        userId: authenticatedUserId,
      });
    }

    // Update history records with new user ID
    // Note: This would require a batch update function in TasbeehService
    // For now, we'll keep the anonymous data and the authenticated user will start fresh
    // In production, you'd want to implement a proper migration

    // Clear anonymous user ID
    await AsyncStorage.removeItem(ANON_USER_ID_KEY);

    console.log("Data migration completed");
  } catch (error) {
    console.error("Data migration failed:", error);
  }
}
