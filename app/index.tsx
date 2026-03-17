import { LinearGradient } from "expo-linear-gradient";
import { ImageBackground, StyleSheet, View, Text, TouchableOpacity, TextInput, Animated } from "react-native";
import { theme } from "../constants/theme";
import "../global.css";
import { useState, useRef, useEffect } from "react";
import KeyboardSpacer from "../components/KeyboardSpacer";

export default function Index() {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(100);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [inputValue, setInputValue] = useState("100");
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: sheetVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sheetVisible]);

  const handlePress = () => {
    setCount(prev => prev + 1);
  };

  const handleReset = () => {
    setCount(0);
  };

  const handleSetTarget = () => {
    const newTarget = parseInt(inputValue);
    if (newTarget > 0) {
      setTarget(newTarget);
      setSheetVisible(false);
    }
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
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={handlePress}
            style={styles.counterContainer}
          >
            <View style={[styles.progressRing, isComplete && styles.progressRingComplete]}>
              <View 
                style={[
                  styles.progressCircle, 
                  { 
                    borderTopColor: progress > 0 ? theme.colors.primary.main : 'transparent',
                    borderRightColor: progress > 25 ? theme.colors.primary.main : 'transparent',
                    borderBottomColor: progress > 50 ? theme.colors.primary.main : 'transparent',
                    borderLeftColor: progress > 75 ? theme.colors.primary.main : 'transparent',
                    transform: [{ rotate: `${progress * 3.6}deg` }]
                  }
                ]} 
              />
              <View style={styles.progressInner}>
                <Text style={styles.count}>{count}</Text>
                <TouchableOpacity onPress={() => setSheetVisible(true)} activeOpacity={0.7}>
                  <Text style={styles.targetText}>of {target}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

      {sheetVisible && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1}
          onPress={() => setSheetVisible(false)}
        />
      )}

      <Animated.View 
        style={[
          styles.bottomSheet,
          {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [400, 0],
              }),
            }],
          },
        ]}
        pointerEvents={sheetVisible ? "auto" : "none"}
      >
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Set Target</Text>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          keyboardType="number-pad"
          placeholder="Enter target"
          placeholderTextColor={theme.colors.text.tertiary}
        />
        <View style={styles.sheetButtons}>
          <TouchableOpacity onPress={() => setSheetVisible(false)} style={styles.sheetBtn}>
            <Text style={styles.sheetBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSetTarget} style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
            <Text style={[styles.sheetBtnText, styles.sheetBtnTextPrimary]}>Set</Text>
          </TouchableOpacity>
        </View>
        <KeyboardSpacer topSpacing={20} />
      </Animated.View>
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
    position: "relative",
  },
  progressCircle: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: "transparent",
  },
  progressRingComplete: {
    ...theme.shadows.glow,
  },
  progressInner: {
    alignItems: "center",
    zIndex: 1,
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
    opacity: 0.6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 0,
    borderTopWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border.secondary,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    color: theme.colors.text.primary,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    backgroundColor: theme.colors.surface.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 20,
    textAlign: "center",
  },
  sheetButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  sheetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surface.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    alignItems: "center",
  },
  sheetBtnPrimary: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  sheetBtnText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: "600",
  },
  sheetBtnTextPrimary: {
    color: theme.colors.background.primary,
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
