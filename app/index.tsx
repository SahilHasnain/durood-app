import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import KeyboardSpacer from "../components/KeyboardSpacer";
import { theme } from "../constants/theme";
import "../global.css";

export default function Index() {
  const ACTIONS_SLEEP_MS = 10000;
  const RING_SIZE = 160;
  const RING_STROKE_WIDTH = 6;
  const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(100);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [inputValue, setInputValue] = useState("100");
  const [actionsVisible, setActionsVisible] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(RING_CIRCUMFERENCE)).current;
  const hideActionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [animatedProgressOffset, setAnimatedProgressOffset] = useState(
    RING_CIRCUMFERENCE
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    saveData();
  }, [count, target]);

  const loadData = async () => {
    try {
      const savedCount = await AsyncStorage.getItem("tasbeeh_count");
      const savedTarget = await AsyncStorage.getItem("tasbeeh_target");
      if (savedCount !== null) setCount(parseInt(savedCount));
      if (savedTarget !== null) {
        setTarget(parseInt(savedTarget));
        setInputValue(savedTarget);
      }
    } catch (error) {
      console.error("Failed to load data", error);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem("tasbeeh_count", count.toString());
      await AsyncStorage.setItem("tasbeeh_target", target.toString());
    } catch (error) {
      console.error("Failed to save data", error);
    }
  };

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: sheetVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sheetVisible]);

  useEffect(() => {
    Animated.timing(actionsAnim, {
      toValue: actionsVisible ? 1 : 0,
      duration: actionsVisible ? 260 : 360,
      useNativeDriver: true,
    }).start();
  }, [actionsAnim, actionsVisible]);

  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      setAnimatedProgressOffset(value);
    });

    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim]);

  const clearHideActionsTimer = () => {
    if (hideActionsTimerRef.current) {
      clearTimeout(hideActionsTimerRef.current);
      hideActionsTimerRef.current = null;
    }
  };

  const startHideActionsTimer = () => {
    clearHideActionsTimer();
    hideActionsTimerRef.current = setTimeout(() => {
      setActionsVisible(false);
    }, ACTIONS_SLEEP_MS);
  };

  const showActionsTemporarily = () => {
    setActionsVisible(true);
    startHideActionsTimer();
  };

  useEffect(() => {
    if (sheetVisible) {
      clearHideActionsTimer();
      setActionsVisible(true);
      return;
    }

    if (actionsVisible) {
      startHideActionsTimer();
    }

    return () => {
      clearHideActionsTimer();
    };
  }, [sheetVisible, actionsVisible]);

  useEffect(() => {
    return () => {
      clearHideActionsTimer();
    };
  }, []);

  const handlePress = () => {
    setCount((prev) => (prev >= target ? 0 : prev + 1));
  };

  const handleReset = () => {
    setCount(0);
  };

  const handleSetTarget = () => {
    const newTarget = parseInt(inputValue);
    if (newTarget > 0) {
      setTarget(newTarget);
      setSheetVisible(false);
      Keyboard.dismiss();
    }
  };

  const handleBackgroundPress = () => {
    if (!sheetVisible && !actionsVisible) {
      showActionsTemporarily();
    }
  };

  const progress = Math.min((count / target) * 100, 100);
  const isComplete = count >= target;
  const progressOffset =
    RING_CIRCUMFERENCE - (progress / 100) * RING_CIRCUMFERENCE;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressOffset,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressAnim, progressOffset]);

  return (
    <SafeAreaView
      className="flex-1"
      edges={["bottom"]}
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

      <Pressable style={styles.container} onPress={handleBackgroundPress}>
        <View style={styles.counterWrapper}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            style={styles.counterContainer}
          >
            <View
              style={[
                styles.progressRing,
                isComplete && styles.progressRingComplete,
              ]}
            >
              <Svg
                width={RING_SIZE}
                height={RING_SIZE}
                style={styles.progressSvg}
                viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              >
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={theme.colors.border.primary}
                  strokeWidth={RING_STROKE_WIDTH}
                  fill="none"
                  opacity={0.55}
                />
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={theme.colors.primary.main}
                  strokeWidth={RING_STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={animatedProgressOffset}
                  fill="none"
                  transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                />
              </Svg>
              <View style={styles.progressInner}>
                <Text style={styles.count}>{count}</Text>
                <Text style={styles.targetText}>of {target}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <Animated.View
            pointerEvents={actionsVisible ? "auto" : "none"}
            style={[
              styles.buttonRow,
              {
                opacity: actionsAnim,
                transform: [
                  {
                    translateY: actionsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                  {
                    scale: actionsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setSheetVisible(true);
              }}
              style={styles.iconBtn}
            >
              <Text style={styles.iconBtnLabel}>Target</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReset} style={styles.iconBtn}>
              <Text style={styles.iconBtnLabel}>Reset</Text>
            </TouchableOpacity>
          </Animated.View>
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
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [400, 0],
                  }),
                },
              ],
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
            keyboardType="numeric"
            placeholder="Enter target"
            placeholderTextColor={theme.colors.text.tertiary}
            returnKeyType="done"
            onSubmitEditing={handleSetTarget}
            blurOnSubmit={true}
          />
          <View style={styles.sheetButtons}>
            <TouchableOpacity
              onPress={() => setSheetVisible(false)}
              style={styles.sheetBtn}
            >
              <Text style={styles.sheetBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSetTarget}
              style={[styles.sheetBtn, styles.sheetBtnPrimary]}
            >
              <Text style={[styles.sheetBtnText, styles.sheetBtnTextPrimary]}>
                Set
              </Text>
            </TouchableOpacity>
          </View>
          <KeyboardSpacer topSpacing={20} />
        </Animated.View>
      </Pressable>
    </SafeAreaView>
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
  progressSvg: {
    position: "absolute",
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
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    width: "100%",
  },
  iconBtn: {
    width: 92,
    height: 56,
    borderRadius: 20,
    backgroundColor: theme.colors.surface.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnLabel: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: "600",
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
});
