import { theme } from "@/constants/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface DailyRecord {
    date: string;
    count: number;
    target: number;
}

interface CustomBarChartProps {
    data: DailyRecord[];
}

export function CustomBarChart({ data }: CustomBarChartProps) {
    if (data.length === 0) return null;

    const maxValue = Math.max(...data.map((r) => r.count), ...data.map((r) => r.target), 1);
    const chartHeight = 180;
    const barMaxHeight = 140;

    // Calculate how many bars to show (max 14 for better visibility on mobile)
    const barsToShow = Math.min(data.length, 14);
    const startIndex = Math.max(0, data.length - barsToShow);
    const displayData = data.slice(startIndex);

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

                            return (
                                <View key={`${record.date}-${index}`} style={styles.barWrapper}>
                                    <View style={styles.barValueContainer}>
                                        <Text
                                            style={[
                                                styles.barValue,
                                                { opacity: barHeight > 60 ? 1 : 0.7 },
                                            ]}
                                        >
                                            {record.count}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                height: barHeight,
                                                backgroundColor: metTarget
                                                    ? "#10b981"
                                                    : "rgba(255,255,255,0.18)",
                                            },
                                        ]}
                                    />
                                </View>
                            );
                        })}
                    </View>
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
    barValueContainer: {
        height: 20,
        justifyContent: "flex-end",
        minWidth: 30,
    },
    barValue: {
        fontSize: 10,
        color: theme.colors.text.secondary,
        fontWeight: "700",
        textAlign: "center",
    },
    bar: {
        width: "100%",
        borderRadius: 6,
        marginTop: 4,
        minWidth: 6,
    },
    xAxis: {
        flexDirection: "row",
        marginTop: 12,
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
