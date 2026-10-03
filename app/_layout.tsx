import { AnimatedTabBar } from "@/components/AnimatedTabBar";
import { theme } from "@/constants/theme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TabBarVisibilityProvider, useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTasbeehStore } from "@/stores/tasbeehStore";
import { recordTasbeehDebug } from "@/services/tasbeehDebug";
import { subscribeToGlobalRecitations } from "@/services/globalCounter";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useRef, useState } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

function AutoSyncOnReconnect() {
  const { user } = useAuth();
  const wasOfflineRef = useRef(false);
  const lastNetworkSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;
      const signature = `${connected}:${state.isInternetReachable ?? "unknown"}:${state.type}`;
      if (lastNetworkSignatureRef.current === signature) return;
      lastNetworkSignatureRef.current = signature;
      void recordTasbeehDebug("network:change", {
        connected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
      if (!connected) {
        wasOfflineRef.current = true;
      } else if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        useTasbeehStore.getState().retryPendingSync(user?.id);
      }
    });

    return unsubscribe;
  }, [user?.id]);

  return null;
}

function RootLayoutContent() {
  const { translateY } = useTabBarVisibility();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 1200;
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <View style={[{ flex: 1 }, isDesktopWeb && !isFullscreen && { paddingLeft: 232 }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary.main,
          tabBarInactiveTintColor: theme.colors.text.secondary,
        }}
        tabBar={(props) => <AnimatedTabBar {...props} translateY={translateY} isFullscreen={isFullscreen} />}
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
        name="fazilat"
        options={{
          title: "Durood",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "flower" : "flower-outline"}
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
    </View>
  );
}

function GlobalCounterSync() {
  useEffect(() => {
    const setGlobalRecitations = useTasbeehStore.getState().setGlobalRecitations;
    let active = true;
    let unsubscribe: (() => Promise<void>) | undefined;

    void subscribeToGlobalRecitations((total) => {
      if (active) setGlobalRecitations(total);
    })
      .then((cleanup) => {
        if (active) {
          unsubscribe = cleanup;
        } else {
          void cleanup();
        }
      })
      .catch((error) => {
        if (active) {
          setGlobalRecitations(null);
          void recordTasbeehDebug("global-counter:error", {
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      active = false;
      setGlobalRecitations(null);
      if (unsubscribe) void unsubscribe();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
          <AuthProvider>
          <AutoSyncOnReconnect />
          <GlobalCounterSync />
          <TabBarVisibilityProvider tabBarHeight={68}>
            <StatusBar style="light" />
            <RootLayoutContent />
          </TabBarVisibilityProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
