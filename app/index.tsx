import { LinearGradient } from "expo-linear-gradient";
import { ImageBackground, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { theme } from "../constants/theme";
import "../global.css";
import { useState } from "react";

export default function Index() {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(33);

  const handlePress = () => {
    setCount(prev => prev + 1);
  };

  const handleReset = () => {
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
        <View style={styles.counterWrapper}>
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

          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: "flex-end",
    paddingBottom: 40,
  },
  counterWrapper: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    color: theme.colors.primary.main,
    marginBottom: 16,
    fontWeight: "600",
  },
  counterContainer: {
    position: "relative",
    marginBottom: 20,
  },
  progressRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: theme.colors.border.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface.primary,
  },
  progressRingComplete: {
    borderColor: theme.colors.primary.main,
    ...theme.shadows.glow,
  },
  progressInner: {
    alignItems: "center",
  },
  count: {
    fontSize: 48,
    fontWeight: "bold",
    color: theme.colors.text.primary,
  },
  targetText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginTop: 4,
  },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: theme.colors.primary.main,
    borderRadius: 2,
  },
  resetBtn: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.surface.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
  },
  resetText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: "600",
  },
});
