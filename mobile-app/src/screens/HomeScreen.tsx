import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppContainer } from "../components/AppContainer";
import { MetricCard } from "../components/MetricCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../features/auth/AuthContext";
import { appStyles } from "../theme/styles";
import { colors, radius, spacing, typography } from "../theme/tokens";

const roleCopy: Record<string, { title: string; subtitle: string }> = {
  patient: {
    title: "Patient mobile foundation",
    subtitle: "Phase 2 will add doctors, booking, appointments, and queue status.",
  },
  doctor: {
    title: "Doctor mobile foundation",
    subtitle: "Phase 3 will add queue controls, schedule, and patient actions.",
  },
  hospital_admin: {
    title: "Admin mobile foundation",
    subtitle: "Phase 4 will add dashboard panels, doctors, appointments, and alerts.",
  },
  super_admin: {
    title: "Super admin foundation",
    subtitle: "Advanced analytics and control screens will be added later.",
  },
};

export function HomeScreen() {
  const { user, signOut } = useAuth();
  const role = user?.role || "patient";
  const copy = roleCopy[role] || roleCopy.patient;

  return (
    <AppContainer scroll contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>MediFlow</Text>
        </View>
        <Text style={appStyles.title}>{copy.title}</Text>
        <Text style={appStyles.subtitle}>{copy.subtitle}</Text>
      </View>

      <View style={styles.profileChip}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name || user?.email || "M").slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>{user?.name || "MediFlow User"}</Text>
          <Text style={styles.profileRole}>{role.replace("_", " ")}</Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <MetricCard label="Theme" value="Web" meta="Matched tokens" />
        <MetricCard label="Session" value="Ready" meta="Async persisted" />
      </View>

      <View style={[appStyles.panel, styles.phasePanel]}>
        <Text style={appStyles.sectionTitle}>Phase 1 complete baseline</Text>
        <Text style={styles.panelText}>Shared theme, auth bootstrap, token persistence, and role-aware shell are now in place.</Text>
        <View style={styles.phaseList}>
          <Text style={styles.phaseItem}>• same color system as the web app</Text>
          <Text style={styles.phaseItem}>• mobile auth using the existing backend</Text>
          <Text style={styles.phaseItem}>• reusable cards, inputs, and primary button</Text>
          <Text style={styles.phaseItem}>• ready for patient screens in Phase 2</Text>
        </View>
        <PrimaryButton label="Sign Out" onPress={signOut} />
      </View>

      <Pressable style={styles.footerCard}>
        <Text style={styles.footerTitle}>Pixel clone note</Text>
        <Text style={styles.footerText}>
          We can match the same visual language closely, but React Native screens still need native layout adaptation rather than direct HTML/CSS duplication.
        </Text>
      </Pressable>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  hero: {
    gap: spacing.sm,
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  heroBadgeText: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    padding: 4,
    paddingRight: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  avatar: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: colors.accent,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  profileCopy: {
    gap: 1,
  },
  profileName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  profileRole: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  phasePanel: {
    gap: spacing.md,
  },
  panelText: {
    ...typography.body,
    color: "#4b5563",
  },
  phaseList: {
    gap: 8,
  },
  phaseItem: {
    color: colors.text,
    fontSize: 14,
  },
  footerCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: "#f1f8f7",
    borderWidth: 1,
    borderColor: "rgba(95, 183, 180, 0.12)",
  },
  footerTitle: {
    marginBottom: 8,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
  },
  footerText: {
    ...typography.bodySmall,
    color: "#5b6770",
  },
});
