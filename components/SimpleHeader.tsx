import { theme } from "@/constants/theme";
import { useAppearance } from "@/contexts/AppearanceContext";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useTasbeehStore } from "@/stores/tasbeehStore";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SimpleHeaderProps {
  translateY: SharedValue<number>;
}

function formatGlobalCount(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function SimpleHeader({ translateY }: SimpleHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1200;
  const globalRecitations = useTasbeehStore((state) => state.globalRecitations);
  const { preference, setPreference, theme: activeTheme } = useAppearance();

  const cycleAppearance = () => {
    const nextPreference = preference === "system"
      ? "light"
      : preference === "light"
        ? "dark"
        : "system";
    void setPreference(nextPreference);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: activeTheme.colors.background.primary, borderBottomColor: activeTheme.colors.background.tertiary }, animatedStyle]}>
      <View
        style={[
          styles.content,
          isDesktop && styles.desktopContent,
          { paddingTop: isDesktop ? 20 : insets.top + 12 },
        ]}
      >
        <View style={styles.headerRow}>
            <View style={[styles.logoContainer, isDesktop && styles.desktopLogoContainer]}>
            <View style={styles.logoWrapper}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.logo}
                contentFit="cover"
              />
            </View>
            {!isDesktop && (
              <View
                accessibilityLabel={`Global recitations: ${globalRecitations ?? "loading"}`}
                 style={[styles.globalCounter, { backgroundColor: activeTheme.colors.accentSurface, borderColor: activeTheme.colors.accentBorder }]}
              >
                 <Ionicons name="globe-outline" size={16} color={activeTheme.colors.primary.main} />
                <AnimatedNumber
                  value={globalRecitations}
                  formatValue={formatGlobalCount}
                   style={[styles.globalCounterValue, { color: activeTheme.colors.text.primary }]}
                />
                 <Text style={[styles.globalCounterLabel, { color: activeTheme.colors.text.secondary }]}>global</Text>
                </View>
            )}
          </View>
          {isDesktop && (
            <View style={styles.desktopGlobalCounterWrap} pointerEvents="none">
              <View
                accessibilityLabel={`Global recitations: ${globalRecitations ?? "loading"}`}
                style={[styles.globalCounter, { backgroundColor: activeTheme.colors.accentSurface, borderColor: activeTheme.colors.accentBorder }]}
              >
                <Ionicons name="globe-outline" size={16} color={activeTheme.colors.primary.main} />
                <AnimatedNumber
                  value={globalRecitations}
                  formatValue={formatGlobalCount}
                  style={[styles.globalCounterValue, { color: activeTheme.colors.text.primary }]}
                />
                <Text style={[styles.globalCounterLabel, { color: activeTheme.colors.text.secondary }]}>global</Text>
              </View>
            </View>
          )}
          <View style={[styles.headerActions, isDesktop && styles.desktopHeaderActions]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Theme: ${preference}. Change theme`}
              onPress={cycleAppearance}
              style={[styles.themeButton, { backgroundColor: activeTheme.colors.surface.control, borderColor: activeTheme.colors.border.primary }]}
            >
              <Ionicons
                name={preference === "dark" ? "moon-outline" : preference === "light" ? "sunny-outline" : "contrast-outline"}
                size={19}
                color={activeTheme.colors.text.primary}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => router.push("/profile")}
              style={[styles.profileButton, { backgroundColor: activeTheme.colors.surface.control, borderColor: activeTheme.colors.border.primary }]}
            >
              <Ionicons name="person-outline" size={20} color={activeTheme.colors.text.primary} />
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.tertiary,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  desktopContent: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  desktopHeaderActions: {
    gap: 16,
  },
  logoContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  desktopLogoContainer: {
    display: "none",
  },
  desktopGlobalCounterWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  globalCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: theme.colors.accentSurface,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
  },
  globalCounterValue: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  globalCounterLabel: {
    color: theme.colors.text.secondary,
    fontSize: 10,
    fontWeight: "600",
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface.control,
    borderWidth: 1,
    borderColor: theme.colors.surface.control,
  },
  themeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface.control,
    borderWidth: 1,
    borderColor: theme.colors.surface.control,
  },
});
