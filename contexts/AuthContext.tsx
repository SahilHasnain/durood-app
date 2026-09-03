import AsyncStorage from "@react-native-async-storage/async-storage";
import { useClerk, useUser } from "@clerk/clerk-expo";
import { useTasbeehStore } from "@/stores/tasbeehStore";
import { getAppwriteUser, signInWithAppwriteGoogle, signOutFromAppwrite } from "@/services/appwriteAuth";
import NetInfo from "@react-native-community/netinfo";
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    clerkUser: any; // Raw Clerk user object
    logout: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    authProvider: "clerk" | "appwrite";
}

// Temporary provider switch while Appwrite Google auth is being validated.
const authProvider = "appwrite" as const;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user: clerkUser, isLoaded } = useUser();
    const { signOut } = useClerk();
    const [clerkTimedOut, setClerkTimedOut] = useState(false);
    const [knownSignedIn, setKnownSignedIn] = useState(false);
    const [cachedName, setCachedName] = useState("");
    const [cachedEmail, setCachedEmail] = useState("");
    const [appwriteUser, setAppwriteUser] = useState<any>(null);
    const [appwriteLoading, setAppwriteLoading] = useState(authProvider === "appwrite");

    useEffect(() => {
        if (authProvider !== "appwrite") return;

        getAppwriteUser()
            .then(setAppwriteUser)
            .catch(() => setAppwriteUser(null))
            .finally(() => setAppwriteLoading(false));
    }, []);

    useEffect(() => {
        if (isLoaded) return;

        const unsubNetInfo = NetInfo.addEventListener((state) => {
            if (state.isConnected === false) {
                setClerkTimedOut(true);
            }
        });

        const fallbackTimer = setTimeout(() => setClerkTimedOut(true), 8000);

        return () => {
            unsubNetInfo();
            clearTimeout(fallbackTimer);
        };
    }, [isLoaded]);

    // Persist signed-in flag and user info so we can show correct UI when offline
    useEffect(() => {
        if (isLoaded && clerkUser) {
            AsyncStorage.multiSet([
                ["clerk_signed_in", "true"],
                ["clerk_user_name", clerkUser.fullName || clerkUser.firstName || "User"],
                ["clerk_user_email", clerkUser.primaryEmailAddress?.emailAddress || ""],
            ]);
        }
    }, [isLoaded, clerkUser]);

    // When offline/timed-out with no Clerk user, fall back to cached flag
    useEffect(() => {
        if (clerkTimedOut && !clerkUser) {
            AsyncStorage.multiGet(["clerk_signed_in", "clerk_user_name", "clerk_user_email"]).then(
                ([[, signedIn], [, name], [, email]]) => {
                    setKnownSignedIn(signedIn === "true");
                    setCachedName(name ?? "");
                    setCachedEmail(email ?? "");
                }
            );
        }
    }, [clerkTimedOut, clerkUser]);

    console.log("🔍 AuthProvider - isLoaded:", isLoaded, "user:", clerkUser?.id || "null", "timedOut:", clerkTimedOut);

    const user: User | null = authProvider === "appwrite"
        ? appwriteUser
            ? {
                id: appwriteUser.$id,
                email: appwriteUser.email || "",
                name: appwriteUser.name || "User",
                emailVerified: !!appwriteUser.emailVerification,
            }
            : null
        : clerkUser
        ? {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || "",
            name: clerkUser.fullName || clerkUser.firstName || "User",
            emailVerified: clerkUser.primaryEmailAddress?.verification?.status === "verified",
        }
        : knownSignedIn
          ? {
              id: "",
              email: cachedEmail,
              name: cachedName,
              emailVerified: false,
          }
          : null;

    const logout = async () => {
        if (authProvider === "appwrite") {
            await signOutFromAppwrite();
            setAppwriteUser(null);
            useTasbeehStore.getState().reset();
            return;
        }

        await AsyncStorage.multiRemove(["clerk_signed_in", "clerk_user_name", "clerk_user_email"]);
        setKnownSignedIn(false);
        setCachedName("");
        setCachedEmail("");
        await signOut();
        useTasbeehStore.getState().reset();
    };

    const signInWithGoogle = async () => {
        if (authProvider === "appwrite") {
            await signInWithAppwriteGoogle();
            setAppwriteUser(await getAppwriteUser());
            return;
        }

        throw new Error("Use the Clerk sign-in flow for this environment.");
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading: authProvider === "appwrite" ? appwriteLoading : !isLoaded && !clerkTimedOut,
                isAuthenticated: authProvider === "appwrite" ? !!appwriteUser : !!clerkUser || (clerkTimedOut && knownSignedIn),
                clerkUser,
                logout,
                signInWithGoogle,
                authProvider,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
