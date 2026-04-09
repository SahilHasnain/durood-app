import React, { createContext, useCallback, useContext } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";

interface TabBarVisibilityContextType {
    translateY: ReturnType<typeof useSharedValue<number>>;
    tabBarHeight: number;
    showTabBar: () => void;
}

const TabBarVisibilityContext = createContext<TabBarVisibilityContextType | undefined>(
    undefined
);

export function TabBarVisibilityProvider({
    children,
    tabBarHeight = 68,
}: {
    children: React.ReactNode;
    tabBarHeight?: number;
}) {
    const translateY = useSharedValue(0);
    const showTabBar = useCallback(() => {
        translateY.value = withTiming(0, {
            duration: 300,
        });
    }, [translateY]);

    return (
        <TabBarVisibilityContext.Provider value={{ translateY, tabBarHeight, showTabBar }}>
            {children}
        </TabBarVisibilityContext.Provider>
    );
}

export function useTabBarVisibility() {
    const context = useContext(TabBarVisibilityContext);
    if (!context) {
        throw new Error("useTabBarVisibility must be used within TabBarVisibilityProvider");
    }
    return context;
}
