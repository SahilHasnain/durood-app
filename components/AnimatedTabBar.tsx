import { theme } from "@/constants/theme";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AnimatedTabBarProps extends BottomTabBarProps {
    translateY: SharedValue<number>;
}

const DESKTOP_BREAKPOINT = 1200;
const DESKTOP_NAV_WIDTH = 232;

export function AnimatedTabBar({
    state,
    descriptors,
    navigation,
    translateY,
}: AnimatedTabBarProps) {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;
    const TAB_BAR_HEIGHT = 56;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: isDesktop
            ? [{ translateX: translateY.value > 0 ? -DESKTOP_NAV_WIDTH : 0 }]
            : [{ translateY: translateY.value }],
    }));

    const hiddenRouteNames = new Set(["index", "video", "videos", "auth", "privacy-policy"]);
    const visibleRoutes = state.routes.filter((route) => {
        if (route.name === "shorts" && !isDesktop) return false;
        return !hiddenRouteNames.has(route.name) && !route.name.startsWith("dalail-reader");
    });

    return (
        <Animated.View
            style={[
                {
                    position: "absolute",
                    ...(isDesktop
                        ? {
                            top: 0,
                            bottom: 0,
                            left: -DESKTOP_NAV_WIDTH,
                            width: DESKTOP_NAV_WIDTH,
                            paddingTop: 32,
                            paddingHorizontal: 16,
                            backgroundColor: theme.colors.background.secondary,
                            borderRightColor: theme.colors.border.primary,
                            borderRightWidth: 1,
                        }
                        : {
                            bottom: 0,
                            left: 0,
                            right: 0,
                            flexDirection: "row" as const,
                            backgroundColor: theme.colors.background.primary,
                            borderTopColor: theme.colors.border.primary,
                            borderTopWidth: 0.5,
                            height: TAB_BAR_HEIGHT + insets.bottom,
                            paddingBottom: insets.bottom + 4,
                            ...Platform.select({
                                ios: {
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: -1 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 2,
                                },
                                android: {
                                    elevation: 8,
                                },
                            }),
                        }),
                },
                animatedStyle,
            ]}
        >
            {isDesktop && (
                <View style={styles.desktopBrand}>
                    <View style={styles.desktopLogoMark}>
                        <Text style={styles.desktopLogoText}>D</Text>
                    </View>
                    <View>
                        <Text style={styles.desktopBrandTitle}>Durood Time</Text>
                        <Text style={styles.desktopBrandSubtitle}>Your daily salawat</Text>
                    </View>
                </View>
            )}
            {visibleRoutes.map((route) => {
                const index = state.routes.indexOf(route);
                const { options } = descriptors[route.key];
                const label =
                    options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: "tabPress",
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: "tabLongPress",
                        target: route.key,
                    });
                };

                const icon = options.tabBarIcon
                    ? options.tabBarIcon({
                        focused: isFocused,
                        color: isFocused ? theme.colors.text.primary : theme.colors.text.secondary,
                        size: isDesktop ? 21 : 24,
                    })
                    : null;

                return (
                    <Pressable
                        key={route.key}
                        accessibilityRole={isDesktop ? "link" : "button"}
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        style={isDesktop
                            ? [styles.desktopRoute, isFocused && styles.desktopRouteActive]
                            : styles.mobileRoute}
                    >
                        <View style={isDesktop ? styles.desktopRouteContent : styles.mobileRouteContent}>
                            {icon}
                            <Text
                                style={isDesktop
                                    ? [styles.desktopRouteLabel, isFocused && styles.desktopRouteLabelActive]
                                    : styles.mobileRouteLabel}
                            >
                                {typeof label === "string" ? label : ""}
                            </Text>
                        </View>
                    </Pressable>
                );
            })}
            {isDesktop && <Text style={styles.desktopFooter}>Take a moment for salawat.</Text>}
        </Animated.View>
    );
}

const styles = {
    desktopBrand: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingHorizontal: 8,
        marginBottom: 36,
    },
    desktopLogoMark: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: theme.colors.primary.main,
    },
    desktopLogoText: {
        color: "#03140d",
        fontSize: 18,
        fontWeight: "800" as const,
    },
    desktopBrandTitle: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: "700" as const,
    },
    desktopBrandSubtitle: {
        color: theme.colors.text.tertiary,
        fontSize: 11,
        marginTop: 2,
    },
    desktopRoute: {
        minHeight: 44,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 13,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 6,
    },
    desktopRouteActive: {
        backgroundColor: "rgba(16,185,129,0.14)",
    },
    desktopRouteContent: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 13,
    },
    desktopRouteLabel: {
        color: theme.colors.text.secondary,
        fontSize: 14,
        fontWeight: "500" as const,
    },
    desktopRouteLabelActive: {
        color: theme.colors.primary.light,
        fontWeight: "700" as const,
    },
    desktopFooter: {
        position: "absolute" as const,
        left: 24,
        right: 24,
        bottom: 28,
        color: theme.colors.text.tertiary,
        fontSize: 12,
        lineHeight: 18,
    },
    mobileRoute: {
        flex: 1,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        paddingTop: 8,
    },
    mobileRouteContent: {
        alignItems: "center" as const,
    },
    mobileRouteLabel: {
        color: theme.colors.text.secondary,
        fontSize: 10,
        fontWeight: "500" as const,
        marginTop: 4,
    },
};
