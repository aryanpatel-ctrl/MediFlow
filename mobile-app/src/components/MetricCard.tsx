import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../theme/tokens";

type Props = {
  label: string;
  value: string;
  meta: string;
};

export function MetricCard({ label, value, meta }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <View style={styles.footer}>
        <View style={styles.dot} />
        <Text style={styles.meta}>{meta}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(95, 183, 180, 0.08)",
    shadowColor: colors.accentStrong,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 3,
  },
  label: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    marginTop: 14,
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.md,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#effaf8",
    borderWidth: 1,
    borderColor: "rgba(95, 183, 180, 0.15)",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  meta: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: "600",
  },
});
