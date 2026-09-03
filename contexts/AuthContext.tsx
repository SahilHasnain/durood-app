import { getAppwriteUser, signInWithAppwriteGoogle, signOutFromAppwrite } from "@/services/appwriteAuth";
import { useTasbeehStore } from "@/stores/tasbeehStore";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAppwriteUser()
            .then((appwriteUser) => {
                setUser({
                    id: appwriteUser.$id,
                    email: appwriteUser.email || "",
                    name: appwriteUser.name || "User",
                    emailVerified: !!appwriteUser.emailVerification,
                });
            })
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const logout = async () => {
        await signOutFromAppwrite();
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
