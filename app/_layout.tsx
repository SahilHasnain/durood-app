import { AnimatedTabBar } from "@/components/AnimatedTabBar";
import { theme } from "@/constants/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { TabBarVisibilityProvider, useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { tokenCache } from "@/utils/tokenCache";
import { ClerkProvider } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { Text as RNText, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

function RootLayoutContent() {
  const { translateY } = useTabBarVisibility();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary.main,
        tabBarInactiveTintColor: theme.colors.text.secondary,
      }}
      tabBar={(props) => <AnimatedTabBar {...props} translateY={translateY} />}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dalail"
        options={{
          title: "Dalail",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "book" : "book-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "stats-chart" : "stats-chart-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: "Planner",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calculator" : "calculator-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: "Videos",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "videocam" : "videocam-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shorts"
        options={{
          title: "Shorts",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "play-circle" : "play-circle-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="video"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="dalail-reader"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="privacy-policy"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="auth"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync("#000000");

    console.log("🔐 Clerk initialization starting...");
    console.log("📱 Publishable Key:", "pk_live_Y2xlcmsuZHVyb29kLmxpdmUk");

    // Global error handler to catch Clerk errors
    const originalError = console.error;
    console.error = (...args) => {
      originalError(...args);
      const errorMsg = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      console.log("🔴 ERROR CAPTURED:", errorMsg);
      if (errorMsg.toLowerCase().includes('clerk')) {
        setError(errorMsg);
      }
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const publishableKey = "pk_live_Y2xlcmsuZHVyb29kLmxpdmUk";

  if (error) {
    console.log("❌ Showing error screen with message:", error);
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Ionicons name="warning-outline" size={48} color="#ef4444" />
        <RNText style={{ color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 16, textAlign: "center" }}>
          Initialization Error
        </RNText>
        <RNText style={{ color: "#999", fontSize: 12, marginTop: 8, textAlign: "center", fontFamily: "monospace" }}>
          {error.substring(0, 500)}
        </RNText>
      </View>
    );
  }

  console.log("🔄 Rendering ClerkProvider...");

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <TabBarVisibilityProvider tabBarHeight={68}>
              <StatusBar style="light" />
              <RootLayoutContent />
            </TabBarVisibilityProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}
