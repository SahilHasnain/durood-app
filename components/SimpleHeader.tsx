import { colors, theme } from "@/constants/theme";
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

function formatGlobalCount(value: number | null): string {
  if (value === null) return "...";
  return new Intl.NumberFormat("en-IN").format(value);
}

export function SimpleHeader({ translateY }: SimpleHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1200;
  const globalRecitations = useTasbeehStore((state) => state.globalRecitations);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
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
                style={styles.globalCounter}
              >
                <Ionicons name="globe-outline" size={16} color={theme.colors.primary.main} />
                <Text style={styles.globalCounterValue}>{formatGlobalCount(globalRecitations)}</Text>
                <Text style={styles.globalCounterLabel}>global</Text>
                </View>
            )}
          </View>
          {isDesktop && (
            <View
              accessibilityLabel={`Global recitations: ${globalRecitations ?? "loading"}`}
              style={[styles.globalCounter, styles.desktopGlobalCounter]}
            >
              <Ionicons name="globe-outline" size={16} color={theme.colors.primary.main} />
              <Text style={styles.globalCounterValue}>{formatGlobalCount(globalRecitations)}</Text>
              <Text style={styles.globalCounterLabel}>global</Text>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push("/profile")}
            style={[styles.profileButton, isDesktop && styles.desktopProfileButton]}
          >
            <Ionicons name="person-outline" size={20} color={colors.text.primary} />
          </Pressable>
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
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
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
    justifyContent: "space-between",
    gap: 12,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  desktopLogoContainer: {
    display: "none",
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
    color: colors.text.primary,
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
  desktopGlobalCounter: {
    marginLeft: "auto",
    marginRight: 12,
  },
  globalCounterValue: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  globalCounterLabel: {
    color: colors.text.secondary,
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
  desktopProfileButton: {
    marginLeft: "auto",
  },
});
