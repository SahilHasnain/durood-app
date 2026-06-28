import { useClerk, useUser } from "@clerk/clerk-expo";
import { useTasbeehStore } from "@/stores/tasbeehStore";
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user: clerkUser, isLoaded } = useUser();
    const { signOut } = useClerk();
    const [clerkTimedOut, setClerkTimedOut] = useState(false);

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

    console.log("🔍 AuthProvider - isLoaded:", isLoaded, "user:", clerkUser?.id || "null", "timedOut:", clerkTimedOut);

    // Transform Clerk user to our User interface
    const user: User | null = clerkUser
        ? {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || "",
            name: clerkUser.fullName || clerkUser.firstName || "User",
            emailVerified: clerkUser.primaryEmailAddress?.verification?.status === "verified",
        }
        : null;

    const logout = async () => {
        await signOut();
        useTasbeehStore.getState().reset();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading: !isLoaded && !clerkTimedOut,
                isAuthenticated: !!clerkUser,
                clerkUser,
                logout,
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
