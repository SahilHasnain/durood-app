import { theme } from "@/constants/theme";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface DailyRecord {
    date: string;
    count: number;
    target: number;
}

interface CustomBarChartProps {
    data: DailyRecord[];
}

export function CustomBarChart({ data }: CustomBarChartProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    if (data.length === 0) return null;

    const maxValue = Math.max(...data.map((r) => r.count), ...data.map((r) => r.target), 1);
    const chartHeight = 180;
    const barMaxHeight = 140;

    // Calculate how many bars to show (max 14 for better visibility on mobile)
    const barsToShow = Math.min(data.length, 14);
    const startIndex = Math.max(0, data.length - barsToShow);
    const displayData = data.slice(startIndex);
    const selectedRecord = selectedIndex === null ? null : displayData[selectedIndex];

    const formatDate = (value: string) => {
        return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
    };

    return (
        <View style={styles.container}>
            {/* Y-axis labels */}
            <View style={styles.chartWrapper}>
                <View style={styles.yAxis}>
                    <Text style={styles.yLabel}>{Math.ceil(maxValue)}</Text>
                    <Text style={styles.yLabel}>{Math.ceil(maxValue / 2)}</Text>
                    <Text style={styles.yLabel}>0</Text>
                </View>

                {/* Bars */}
                <View style={[styles.barsContainer, { height: chartHeight }]}> 
                    {/* Grid lines */}
                    <View style={styles.gridLine} />
                    <View style={styles.gridLine} />
                    <View style={styles.gridLine} />

                    {/* Bars */}
                    <View style={styles.bars}>
                        {displayData.map((record, index) => {
                            const heightPercent = (record.count / maxValue) * 100;
                            const barHeight = (heightPercent / 100) * barMaxHeight;
                            const metTarget = record.count >= record.target;
                            const isSelected = selectedIndex === index;

                            return (
                                <Pressable
                                    key={`${record.date}-${index}`}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${formatDate(record.date)} count ${record.count}`}
                                    onPress={() => setSelectedIndex(isSelected ? null : index)}
                                    style={styles.barWrapper}
                                >
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                height: barHeight,
                                                backgroundColor: metTarget
                                                    ? "#10b981"
                                                    : "rgba(255,255,255,0.18)",
                                                borderColor: isSelected ? theme.colors.text.primary : "transparent",
                                            },
                                        ]}
                                    />
                                </Pressable>
                            );
                        })}
                    </View>

                    {selectedRecord && (
                        <View
                            pointerEvents="none"
                            style={[
                                styles.tooltip,
                                selectedIndex === 0 && styles.tooltipLeft,
                                selectedIndex === displayData.length - 1 && styles.tooltipRight,
                                selectedIndex !== 0 && selectedIndex !== displayData.length - 1 && {
                                    left: `${((selectedIndex + 0.5) / displayData.length) * 100}%`,
                                    transform: [{ translateX: -59 }],
                                },
                            ]}
                        >
                            <Text style={styles.tooltipDate}>{formatDate(selectedRecord.date)}</Text>
                            <Text style={styles.tooltipCount}>{selectedRecord.count.toLocaleString()}</Text>
                            <Text style={styles.tooltipMeta}>
                                {selectedRecord.count >= selectedRecord.target ? "Target met" : `Target ${selectedRecord.target}`}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* X-axis labels (dates) */}
            <View style={styles.xAxis}>
                {displayData.map((record, index) => {
                    const day = record.date.split("-")[2];
                    const isEveryOther = displayData.length > 10 ? index % 2 === 0 : true;

                    return (
                        <View key={`label-${record.date}-${index}`} style={styles.xLabel}>
                            {isEveryOther && <Text style={styles.xLabelText}>{day}</Text>}
                        </View>
                    );
                })}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
                    <Text style={styles.legendLabel}>Target met</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "rgba(255,255,255,0.18)" }]} />
                    <Text style={styles.legendLabel}>Under target</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 18,
    },
    chartWrapper: {
        flexDirection: "row",
    },
    yAxis: {
        width: 45,
        justifyContent: "space-between",
        paddingRight: 8,
        paddingTop: 4,
    },
    yLabel: {
        fontSize: 11,
        color: theme.colors.text.secondary,
        fontWeight: "600",
        textAlign: "right",
    },
    barsContainer: {
        flex: 1,
        position: "relative",
        marginLeft: 8,
    },
    gridLine: {
        position: "absolute",
        width: "100%",
        height: 1,
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    bars: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-around",
        paddingHorizontal: 4,
    },
    barWrapper: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-end",
        marginHorizontal: 2,
    },
    bar: {
        width: "100%",
        borderRadius: 6,
        minWidth: 6,
        borderWidth: 1,
    },
    tooltip: {
        position: "absolute",
        top: 6,
        width: 118,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: theme.colors.surface.elevated,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
    },
    tooltipLeft: {
        left: 0,
    },
    tooltipRight: {
        right: 0,
    },
    tooltipDate: {
        fontSize: 11,
        fontWeight: "700",
        color: theme.colors.text.secondary,
    },
    tooltipCount: {
        marginTop: 2,
        fontSize: 18,
        fontWeight: "900",
        color: theme.colors.text.primary,
    },
    tooltipMeta: {
        marginTop: 1,
        fontSize: 10,
        fontWeight: "700",
        color: "#10b981",
    },
    xAxis: {
        flexDirection: "row",
        marginTop: 10,
        marginLeft: 53,
    },
    xLabel: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    xLabelText: {
        fontSize: 11,
        color: theme.colors.text.secondary,
        fontWeight: "600",
    },
    legend: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
        marginTop: 16,
        paddingVertical: 8,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendLabel: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        fontWeight: "600",
    },
});
