import { StyleSheet } from "react-native";
import { colors, radius, spacing, typography } from "./tokens";

export const appStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  panel: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(95, 183, 180, 0.06)",
    padding: spacing.lg,
    shadowColor: colors.accentStrong,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: "#f9fafb",
    color: colors.text,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    paddingVertical: 16,
    backgroundColor: colors.accent,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700",
  },
  title: {
    ...typography.h1,
    color: "#111827",
  },
  subtitle: {
    ...typography.body,
    color: "#4b5563",
  },
  sectionTitle: {
    ...typography.h2,
    color: "#111827",
  },
});
