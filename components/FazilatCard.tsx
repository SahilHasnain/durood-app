import { FazilatEntry } from "@/data/fazilat";
import { theme } from "@/constants/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface FazilatCardProps {
  entry: FazilatEntry;
}

export const FazilatCard: React.FC<FazilatCardProps> = ({ entry }) => {
  return (
    <View style={styles.card}>
      <View style={styles.accentLine} />
      <View style={styles.content}>
        <Text style={styles.title}>{entry.title}</Text>
        {entry.arabic ? (
          <Text style={styles.arabic}>{entry.arabic}</Text>
        ) : null}
        <Text style={styles.text}>{entry.text}</Text>
        {entry.source ? (
          <Text style={styles.source}>{entry.source}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface.primary,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  accentLine: {
    width: 4,
    backgroundColor: theme.colors.primary.main,
  },
  content: {
    flex: 1,
    padding: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.primary.main,
    marginBottom: 10,
    lineHeight: 22,
  },
  arabic: {
    fontSize: 18,
    color: theme.colors.text.primary,
    textAlign: "right",
    marginBottom: 10,
    lineHeight: 28,
    fontWeight: "500",
  },
  text: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    lineHeight: 24,
  },
  source: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 12,
    fontStyle: "italic",
  },
});
