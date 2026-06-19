import { useAuth } from "@/contexts/AuthContext";
import { useTasbeehStore } from "@/stores/tasbeehStore";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function Index() {
  const { loading: authLoading, user } = useAuth();
  const initialized = useTasbeehStore((state) => state.initialized);
  const initializedUserId = useTasbeehStore((state) => state.initializedUserId);
  const loading = useTasbeehStore((state) => state.loading);
  const loadData = useTasbeehStore((state) => state.loadData);

  useEffect(() => {
    if (authLoading) return;
    if (initialized && initializedUserId === (user?.id ?? undefined)) return;
    void loadData(user?.id);
  }, [authLoading, user?.id, initialized, initializedUserId, loadData]);

  const isReady = !authLoading && !loading;

  if (!isReady) {
    return (
      <View style={styles.container}>
        <Text style={styles.arabicMain}>صَلُّوا عَلَى الْحَبِيب</Text>
        <Text style={styles.arabicSub}>صَلَّى اللَّهُ عَلَى مُحَمَّد</Text>
        <ActivityIndicator size="large" color="#10B981" style={styles.spinner} />
      </View>
    );
  }

  return <Redirect href="/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  arabicMain: {
    fontSize: 28,
    fontWeight: "700",
    color: "#10B981",
    textAlign: "center",
    marginBottom: 12,
  },
  arabicSub: {
    fontSize: 16,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    marginBottom: 40,
  },
  spinner: {
    marginTop: 8,
  },
});
