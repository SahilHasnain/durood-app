import { getAppwriteUser, signInWithAppwriteGoogle, signOutFromAppwrite } from "@/services/appwriteAuth";
import { useTasbeehStore } from "@/stores/tasbeehStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
    logout: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const CACHED_USER_KEY = "tasbeeh_cached_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAppwriteUser()
            .then((appwriteUser) => {
                const nextUser = {
                    id: appwriteUser.$id,
                    email: appwriteUser.email || "",
                    name: appwriteUser.name || "User",
                    emailVerified: !!appwriteUser.emailVerification,
                };
                setUser(nextUser);
                void AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(nextUser));
            })
            .catch(async () => {
                // A temporary network failure must not turn an authenticated
                // user into an anonymous user, including after a cold launch.
                try {
                    const network = await NetInfo.fetch();
                    if (network.isConnected === true && network.isInternetReachable !== false) {
                        await AsyncStorage.removeItem(CACHED_USER_KEY);
                        setUser(null);
                        return;
                    }
                    const cached = await AsyncStorage.getItem(CACHED_USER_KEY);
                    if (cached) setUser(JSON.parse(cached) as User);
                } catch {
                    // Keep the initial anonymous state when no cached user exists.
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const logout = async () => {
        await signOutFromAppwrite();
        await AsyncStorage.removeItem(CACHED_USER_KEY);
        setUser(null);
        useTasbeehStore.getState().reset();
    };

    const signInWithGoogle = async () => {
        await signInWithAppwriteGoogle();
        const appwriteUser = await getAppwriteUser();
        setUser({
            id: appwriteUser.$id,
            email: appwriteUser.email || "",
            name: appwriteUser.name || "User",
            emailVerified: !!appwriteUser.emailVerification,
        });
        await AsyncStorage.setItem(
            CACHED_USER_KEY,
            JSON.stringify({
                id: appwriteUser.$id,
                email: appwriteUser.email || "",
                name: appwriteUser.name || "User",
                emailVerified: !!appwriteUser.emailVerification,
            }),
        );
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, logout, signInWithGoogle }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}
