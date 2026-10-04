import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTheme, type ThemeMode } from "@/constants/theme";
import { useColorScheme } from "react-native";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

export type AppearancePreference = "system" | "light" | "dark";

type AppearanceContextValue = {
    preference: AppearancePreference;
    isDark: boolean;
    mode: ThemeMode;
    theme: ReturnType<typeof createTheme>;
    setPreference: (preference: AppearancePreference) => Promise<void>;
};

const STORAGE_KEY = "app:appearance-preference";
const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
    const systemScheme = useColorScheme();
    const [preference, setPreferenceState] = useState<AppearancePreference>("system");

    useEffect(() => {
        void AsyncStorage.getItem(STORAGE_KEY).then((value) => {
            if (value === "system" || value === "light" || value === "dark") {
                setPreferenceState(value);
            }
        });
    }, []);

    const isDark = preference === "dark" || (preference === "system" && systemScheme !== "light");
    const mode: ThemeMode = isDark ? "dark" : "light";
    const value = useMemo(() => ({
        preference,
        isDark,
        mode,
        theme: createTheme(mode),
        setPreference: async (nextPreference: AppearancePreference) => {
            setPreferenceState(nextPreference);
            await AsyncStorage.setItem(STORAGE_KEY, nextPreference);
        },
    }), [preference, isDark, mode]);

    return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
    const context = useContext(AppearanceContext);
    if (!context) throw new Error("useAppearance must be used within AppearanceProvider");
    return context;
}
