import { AnimatedTabBar } from "@/components/AnimatedTabBar";
import { theme } from "@/constants/theme";
import { TabBarVisibilityProvider, useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
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
        name="video"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync("#000000");
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TabBarVisibilityProvider tabBarHeight={68}>
          <StatusBar style="light" />
          <RootLayoutContent />
        </TabBarVisibilityProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
