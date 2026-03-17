import { LinearGradient } from "expo-linear-gradient";
import { ImageBackground, StyleSheet, View, Text, TouchableOpacity, Vibration } from "react-native";
import { theme } from "../constants/theme";
import "../global.css";
import { useState } from "react";
import * as Haptics from "expo-haptics";

export default function Index() {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(33);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCount(prev => prev + 1);
  };

  const handleReset = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCount(0);
  };

  const progress = Math.min((count / target) * 100, 100);
  const isComplete = count >= target;

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.colors.background.primary }}
    >
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <ImageBackground
          source={require("../assets/images/gumbad.png")}
          resizeMode="cover"
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageAsset}
        >
          <LinearGradient
            colors={[
              "rgba(10, 10, 15, 0.18)",
              "rgba(10, 10, 15, 0.72)",
              "rgba(10, 10, 15, 0.96)",
            ]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </ImageBackground>
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>تسبيح</Text>
        
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handlePress}
          style={styles.counterContainer}
        >
          <View style={[styles.progressRing, isComplete && styles.progressRingComplete]}>
            <View style={styles.progressInner}>
              <Text style={styles.count}>{count}</Text>
              <Text style={styles.targetText}>of {target}</Text>
            </View>
          </View>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </TouchableOpacity>

        <View style={styles.targetButtons}>
          {[33, 99, 100].map(num => (
            <TouchableOpacity
              key={num}
              onPress={() => setTarget(num)}
              style={[styles.targetBtn, target === num && styles.targetBtnActive]}
            >
              <Text style={[styles.targetBtnText, target === num && styles.targetBtnTextActive]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundImageAsset: {
    opacity: 0.95,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 48,
    color: theme.colors.primary.main,
    marginBottom: 60,
    fontWeight: "600",
    ...theme.shadows.glow,
  },
  counterContainer: {
    position: "relative",
    marginBottom: 50,
  },
  progressRing: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 8,
    borderColor: theme.colors.border.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface.primary,
    ...theme.shadows.glowSubtle,
  },
  progressRingComplete: {
    borderColor: theme.colors.primary.main,
    ...theme.shadows.glowStrong,
  },
  progressInner: {
    alignItems: "center",
  },
  count: {
    fontSize: 72,
    fontWeight: "bold",
    color: theme.colors.text.primary,
  },
  targetText: {
    fontSize: 18,
    color: theme.colors.text.tertiary,
    marginTop: 8,
  },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 4,
    backgroundColor: theme.colors.primary.main,
    borderRadius: 2,
  },
  targetButtons: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 40,
  },
  targetBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border.primary,
    backgroundColor: theme.colors.surface.primary,
  },
  targetBtnActive: {
    borderColor: theme.colors.primary.main,
    backgroundColor: theme.colors.surface.secondary,
  },
  targetBtnText: {
    fontSize: 18,
    color: theme.colors.text.tertiary,
    fontWeight: "600",
  },
  targetBtnTextActive: {
    color: theme.colors.primary.main,
  },
  resetBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.surface.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
  },
  resetText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: "600",
  },
});
