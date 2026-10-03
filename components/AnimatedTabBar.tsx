import { theme } from "@/constants/theme";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Image, Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AnimatedTabBarProps extends BottomTabBarProps {
    translateY: SharedValue<number>;
    isFullscreen?: boolean;
}

const DESKTOP_BREAKPOINT = 1200;
const DESKTOP_NAV_WIDTH = 232;

export function AnimatedTabBar({
    state,
    descriptors,
    navigation,
    translateY,
    isFullscreen,
}: AnimatedTabBarProps) {
    const [learnOpen, setLearnOpen] = useState(false);
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;
    const TAB_BAR_HEIGHT = 56;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: isDesktop
            ? [{ translateX: 0 }]
            : [{ translateY: translateY.value }],
    }));

 const hiddenRouteNames = new Set(["index", "video", "auth", "privacy-policy"]);
    const visibleRoutes = state.routes.filter((route) => {
        if (route.name === "shorts") return false;
        if (!isDesktop && route.name === "profile") return false;
        return !hiddenRouteNames.has(route.name)
            && !route.name.startsWith("dalail-reader")
            && !route.name.startsWith("dalail-image");
    });
    const mobileRoutes = visibleRoutes.filter((route) => !["fazilat", "videos"].includes(route.name));
    const activeRouteName = state.routes[state.index]?.name;
    const isLearnActive = activeRouteName === "fazilat" || activeRouteName === "videos";

    useEffect(() => {
        if (isLearnActive) setLearnOpen(false);
    }, [isLearnActive]);

    if (isDesktop && isFullscreen) return null;

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
                                    shadowColor: theme.colors.background.primary,
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
                    <Image
                        source={require("@/assets/images/icon.png")}
                        style={styles.desktopLogoMark}
                        accessibilityLabel="Durood Moments logo"
                    />
                    <View>
                        <Text style={styles.desktopBrandTitle}>Durood Moments</Text>
                        <Text style={styles.desktopBrandSubtitle}>Your daily salawat</Text>
                    </View>
                </View>
            )}
            {(isDesktop
                ? [
                    { label: "Practice", routes: visibleRoutes.filter((route) => ["home", "progress", "planner"].includes(route.name)) },
                     { label: "Learn", routes: visibleRoutes.filter((route) => ["dalail", "fazilat", "videos"].includes(route.name)) },
                    { label: "Account", routes: visibleRoutes.filter((route) => route.name === "profile") },
                ]
                : [{ label: "", routes: mobileRoutes }]
            ).map((group) => (
                <React.Fragment key={group.label || "mobile-navigation"}>
                    {isDesktop && group.routes.length > 0 && (
                        <Text style={styles.desktopSectionLabel}>{group.label}</Text>
                    )}
                    {group.routes.map((route) => {
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
                </React.Fragment>
            ))}
            {!isDesktop && (
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: learnOpen, selected: isLearnActive }}
                    accessibilityLabel="Learn menu"
                    onPress={() => setLearnOpen((open) => !open)}
                    style={[styles.mobileRoute, isLearnActive && styles.mobileRouteActive]}
                >
                    <View style={styles.mobileRouteContent}>
                        <Ionicons name={isLearnActive ? "school" : "school-outline"} size={24} color={isLearnActive ? theme.colors.primary.main : theme.colors.text.secondary} />
                        <Text style={[styles.mobileRouteLabel, isLearnActive && styles.mobileRouteLabelActive]}>Learn</Text>
                    </View>
                </Pressable>
            )}
            {!isDesktop && learnOpen && (
                <>
                    <Pressable style={styles.learnDismiss} onPress={() => setLearnOpen(false)} />
                    <View style={styles.learnPopover}>
                        <Text style={styles.learnPopoverTitle}>Learn</Text>
                        <Pressable
                            style={styles.learnPopoverItem}
                            onPress={() => {
                                setLearnOpen(false);
                                navigation.navigate("fazilat");
                            }}
                        >
                            <Ionicons name="book-outline" size={18} color={theme.colors.primary.main} />
                            <Text style={styles.learnPopoverLabel}>Durood</Text>
                        </Pressable>
                        <Pressable
                            style={styles.learnPopoverItem}
                            onPress={() => {
                                setLearnOpen(false);
                                navigation.navigate("videos");
                            }}
                        >
                            <Ionicons name="videocam-outline" size={18} color={theme.colors.primary.main} />
                            <Text style={styles.learnPopoverLabel}>Videos</Text>
                        </Pressable>
                    </View>
                </>
            )}
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
        overflow: "hidden" as const,
    },
    desktopBrandTitle: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: "700" as const,
    },
    desktopBrandSubtitle: {
        color: theme.colors.text.tertiary,
        fontSize: 10,
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
    desktopSectionLabel: {
        marginTop: 14,
        marginBottom: 8,
        paddingHorizontal: 12,
        color: theme.colors.text.tertiary,
        fontSize: 11,
        fontWeight: "800" as const,
        letterSpacing: 1,
        textTransform: "uppercase" as const,
    },
    desktopRouteActive: {
        backgroundColor: theme.colors.accentActive,
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
    mobileRouteActive: {
        backgroundColor: theme.colors.accentActive,
        borderRadius: 12,
        marginVertical: 4,
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
    mobileRouteLabelActive: {
        color: theme.colors.primary.main,
        fontWeight: "700" as const,
    },
    learnDismiss: {
        position: "absolute" as const,
        left: 0,
        right: 0,
        bottom: 0,
        height: 520,
    },
    learnPopover: {
        position: "absolute" as const,
        right: 12,
        bottom: 64,
        width: 172,
        padding: 8,
        borderRadius: 16,
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        shadowColor: theme.colors.semantic.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 3,
    },
    learnPopoverTitle: {
        color: theme.colors.text.tertiary,
        fontSize: 11,
        fontWeight: "800" as const,
        letterSpacing: 0.8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        textTransform: "uppercase" as const,
    },
    learnPopoverItem: {
        minHeight: 42,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    learnPopoverLabel: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontWeight: "700" as const,
    },
};
