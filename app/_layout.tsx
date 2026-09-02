import { AnimatedTabBar } from "@/components/AnimatedTabBar";
import { theme } from "@/constants/theme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TabBarVisibilityProvider, useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTasbeehStore } from "@/stores/tasbeehStore";
import { tokenCache } from "@/utils/tokenCache";
import { ClerkProvider } from "@clerk/clerk-expo";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useRef } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

function AutoSyncOnReconnect() {
  const { user } = useAuth();
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;
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

  return (
    <View style={[{ flex: 1 }, isDesktopWeb && { paddingLeft: 232 }]}>
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
        name="fazilat"
        options={{
          title: "Fazilat",
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
          href: null,
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

export default function RootLayout() {
  const publishableKey = "pk_live_Y2xlcmsuZHVyb29kLmxpdmUk";

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <AutoSyncOnReconnect />
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
