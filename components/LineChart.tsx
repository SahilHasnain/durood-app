import { theme } from "@/constants/theme";
import React, { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableWithoutFeedback, View } from "react-native";
import Animated, {
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface DataPoint {
    date: string;
    count: number;
    target: number;
}

interface LineChartProps {
    data: DataPoint[];
}

export function LineChart({ data }: LineChartProps) {
    const screenWidth = Dimensions.get("window").width;
    const chartWidth = screenWidth - 64;
    const chartHeight = 200;
    const padding = { top: 20, right: 10, bottom: 30, left: 10 };

    const animationProgress = useSharedValue(0);
    const tooltipOpacity = useSharedValue(0);
    const tooltipY = useSharedValue(0);
    const [selectedPoint, setSelectedPoint] = useState<{
        date: string;
        count: number;
        target: number;
        x: number;
        y: number;
    } | null>(null);

    useEffect(() => {
        animationProgress.value = 0;
        animationProgress.value = withTiming(1, { duration: 1000 });
    }, [data, animationProgress]);

    useEffect(() => {
        if (selectedPoint) {
            tooltipOpacity.value = withSpring(1);
            tooltipY.value = withSpring(selectedPoint.y - 60);
        } else {
            tooltipOpacity.value = withTiming(0, { duration: 200 });
        }
    }, [selectedPoint, tooltipOpacity, tooltipY]);

    if (data.length === 0) {
        return (
            <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>No data yet</Text>
                <Text style={styles.emptyChartSubtext}>
                    Start counting to see your progress
                </Text>
            </View>
        );
    }

    // Calculate dimensions
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;

    // Get max value for scaling
    const maxValue = Math.max(...data.map((d) => Math.max(d.count, d.target)), 100);
    const minValue = 0;

    // Create points for the line
    const points = data.map((point, index) => {
        const x = data.length === 1
            ? padding.left + graphWidth / 2
            : padding.left + (index / (data.length - 1)) * graphWidth;
        const y =
            padding.top +
            graphHeight -
            ((point.count - minValue) / (maxValue - minValue)) * graphHeight;
        return { x, y, count: point.count, target: point.target, date: point.date };
    });

    const handleChartPress = (event: any) => {
        const { locationX } = event.nativeEvent;

        // Find the closest point to the tap
        let closestPoint = points[0];
        let minDistance = Math.abs(locationX - points[0].x);

        points.forEach((point) => {
            const distance = Math.abs(locationX - point.x);
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
            }
        });

        // Toggle tooltip - if same point clicked, hide it
        if (selectedPoint?.date === closestPoint.date) {
            setSelectedPoint(null);
        } else {
            setSelectedPoint(closestPoint);
        }
    };

    // Create SVG path for the line
    const linePath = points
        .map((point, index) => {
            if (index === 0) {
                return `M ${point.x} ${point.y}`;
            }
            if (data.length === 2) {
                // Simple line for 2 points
                return `L ${point.x} ${point.y}`;
            }
            // Smooth curve using quadratic bezier for 3+ points
            const prevPoint = points[index - 1];
            const midX = (prevPoint.x + point.x) / 2;
            return `Q ${midX} ${prevPoint.y}, ${midX} ${(prevPoint.y + point.y) / 2} Q ${midX} ${point.y}, ${point.x} ${point.y}`;
        })
        .join(" ");

    // Create area path (for gradient fill)
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`;

    const animatedLineProps = useAnimatedProps(() => {
        const pathLength = 1000; // Approximate path length
        return {
            strokeDasharray: pathLength,
            strokeDashoffset: pathLength * (1 - animationProgress.value),
        };
    });

    const animatedAreaProps = useAnimatedProps(() => {
        return {
            opacity: animationProgress.value * 0.2,
        };
    });

    const tooltipStyle = useAnimatedStyle(() => {
        if (!selectedPoint) {
            return {
                opacity: 0,
                transform: [{ translateY: 0 }, { translateX: 0 }],
            };
        }

        // Calculate tooltip position with boundary checks
        const tooltipWidth = 120;
        let translateX = selectedPoint.x - tooltipWidth / 2;

        // Prevent clipping on left edge
        if (translateX < 0) {
            translateX = 10;
        }
        // Prevent clipping on right edge
        if (translateX + tooltipWidth > chartWidth) {
            translateX = chartWidth - tooltipWidth - 10;
        }

        return {
            opacity: tooltipOpacity.value,
            transform: [
                { translateY: tooltipY.value },
                { translateX },
            ],
        };
    });

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
        <View style={styles.container}>
            <TouchableWithoutFeedback onPress={handleChartPress}>
                <View>
                    <Svg width={chartWidth} height={chartHeight}>
                        <Defs>
                            <LinearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor="#10b981" stopOpacity="0.8" />
                                <Stop offset="1" stopColor="#10b981" stopOpacity="0.2" />
                            </LinearGradient>
                        </Defs>

                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                            const y = padding.top + graphHeight * ratio;
                            return (
                                <Path
                                    key={ratio}
                                    d={`M ${padding.left} ${y} L ${chartWidth - padding.right} ${y}`}
                                    stroke="rgba(255,255,255,0.05)"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                />
                            );
                        })}

                        {/* Area fill */}
                        <AnimatedPath
                            d={areaPath}
                            fill="url(#lineGradient)"
                            animatedProps={animatedAreaProps}
                        />

                        {/* Line */}
                        <AnimatedPath
                            d={linePath}
                            stroke="#10b981"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            animatedProps={animatedLineProps}
                        />

                        {/* Data points */}
                        {points.map((point, index) => (
                            <Circle
                                key={index}
                                cx={point.x}
                                cy={point.y}
                                r={selectedPoint?.date === point.date ? 6 : point.count >= point.target ? 5 : 4}
                                fill={point.count >= point.target ? "#10b981" : theme.colors.surface.primary}
                                stroke="#10b981"
                                strokeWidth={selectedPoint?.date === point.date ? 3 : 2}
                            />
                        ))}
                    </Svg>

                    {/* X-axis labels (show first, middle, last) */}
                    <View style={styles.labelsContainer}>
                        <Text style={styles.label}>
                            {new Date(data[0].date).getDate()}
                        </Text>
                        {data.length > 2 && (
                            <Text style={styles.label}>
                                {new Date(data[Math.floor(data.length / 2)].date).getDate()}
                            </Text>
                        )}
                        <Text style={styles.label}>
                            {new Date(data[data.length - 1].date).getDate()}
                        </Text>
                    </View>
                </View>
            </TouchableWithoutFeedback>

            {/* Tooltip */}
            {selectedPoint && (
                <Animated.View style={[styles.tooltip, tooltipStyle]}>
                    <Text style={styles.tooltipDate}>{formatDate(selectedPoint.date)}</Text>
                    <Text style={styles.tooltipCount}>{selectedPoint.count.toLocaleString()}</Text>
                    <Text style={styles.tooltipTarget}>
                        {selectedPoint.count >= selectedPoint.target ? "✓ Goal met" : `Target: ${selectedPoint.target}`}
                    </Text>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    emptyChart: {
        height: 200,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyChartText: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text.secondary,
        marginBottom: 4,
    },
    emptyChartSubtext: {
        fontSize: 14,
        color: theme.colors.text.tertiary,
    },
    labelsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 10,
        marginTop: 8,
    },
    label: {
        fontSize: 12,
        color: theme.colors.text.tertiary,
    },
    tooltip: {
        position: "absolute",
        backgroundColor: theme.colors.surface.elevated,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        width: 120,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    tooltipDate: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginBottom: 4,
    },
    tooltipCount: {
        fontSize: 20,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 2,
    },
    tooltipTarget: {
        fontSize: 11,
        color: theme.colors.text.tertiary,
    },
});
