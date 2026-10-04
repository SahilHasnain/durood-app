import { createTheme } from "@/constants/theme";
import { useAppearance } from "@/contexts/AppearanceContext";
import React, { ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface TasbeehRingProps {
    size: number;
    progressOffset: number;
    circumference: number;
    radius: number;
    strokeWidth: number;
    count: ReactNode;
    target?: number;
    completionText?: string;
}

export function TasbeehRing({
    size,
    progressOffset,
    circumference,
    radius,
    strokeWidth,
    count,
    target,
    completionText,
}: TasbeehRingProps) {
    const { theme: activeTheme } = useAppearance();
    const imageSize = size - 17;
    const styles = createStyles(activeTheme);

    return (
        <View style={styles.ring}>
            <Image
                source={require("@/assets/images/background-v1.webp")}
                style={[styles.background, { width: imageSize, height: imageSize, borderRadius: imageSize / 2 }]}
                resizeMode="cover"
            />
            <View
                pointerEvents="none"
                style={[styles.scrim, { width: imageSize, height: imageSize, borderRadius: imageSize / 2 }]}
            />
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={activeTheme.colors.border.primary}
                    strokeWidth={strokeWidth}
                    fill="none"
                    opacity={0.55}
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={activeTheme.colors.primary.main}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={progressOffset}
                    fill="none"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            <View style={styles.content}>
                <Text style={styles.count} selectable={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
                    {count}
                </Text>
                {target !== undefined && <Text style={styles.target}>of {target.toLocaleString("en-IN")}</Text>}
                {completionText && <Text style={styles.completion}>{completionText}</Text>}
            </View>
        </View>
    );
}

function createStyles(activeTheme: ReturnType<typeof createTheme>) {
    return StyleSheet.create({
        ring: {
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
        },
        background: {
            position: "absolute",
            top: 8.5,
            left: 8.5,
            overflow: "hidden",
            opacity: 0.95,
        },
        scrim: {
            position: "absolute",
            top: 8.5,
            left: 8.5,
            backgroundColor: activeTheme.colors.scrim.light,
        },
        content: {
            position: "absolute",
            alignItems: "center",
            justifyContent: "center",
        },
        count: {
            fontSize: 48,
            fontWeight: "700",
            color: activeTheme.colors.semantic.white,
            textShadowColor: activeTheme.colors.semantic.black,
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
        },
        target: {
            fontSize: 16,
            color: "rgba(255,255,255,0.9)",
            textShadowColor: activeTheme.colors.semantic.black,
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
        },
        completion: {
            marginTop: 10,
            fontSize: 13,
            fontWeight: "600",
            color: "rgba(255,255,255,0.88)",
            textShadowColor: activeTheme.colors.semantic.black,
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
        },
    });
}
