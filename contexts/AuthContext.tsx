import * as AuthService from "@/services/authService";
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
    $id: string;
    email: string;
    name: string;
    emailVerification: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (
        email: string,
        password: string,
        name: string
    ) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            setLoading(true);
            const currentUser = await AuthService.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.error("Auth check failed:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        const result = await AuthService.login(email, password);
        if (result.success && result.user) {
            setUser(result.user);
        }
        return result;
    };

    const register = async (email: string, password: string, name: string) => {
        const result = await AuthService.register(email, password, name);
        if (result.success && result.user) {
            setUser(result.user);
        }
        return result;
    };

    const logout = async () => {
        await AuthService.logout();
        setUser(null);
    };

    const refreshUser = async () => {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
                refreshUser,
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
