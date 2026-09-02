import { colors } from "@/constants/theme";
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

export function SimpleHeader({ translateY }: SimpleHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1200;

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
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.logo}
                contentFit="cover"
              />
            </View>
            <Text style={styles.title}>Durood Time</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push("/profile")}
            style={styles.profileButton}
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
    borderBottomColor: "#222",
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
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
});
