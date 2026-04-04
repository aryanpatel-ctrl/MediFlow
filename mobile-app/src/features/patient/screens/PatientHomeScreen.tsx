import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppContainer } from "../../../components/AppContainer";
import { MetricCard } from "../../../components/MetricCard";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { useAuth } from "../../auth/AuthContext";
import { appStyles } from "../../../theme/styles";
import { colors, radius, spacing, typography } from "../../../theme/tokens";

type Props = {
  onOpenDoctors: () => void;
};

export function PatientHomeScreen({ onOpenDoctors }: Props) {
  const { user, signOut } = useAuth();

  return (
    <AppContainer scroll contentStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Patient Portal</Text>
        <Text style={appStyles.title}>Manage appointments with the same MediFlow look</Text>
        <Text style={appStyles.subtitle}>
          This mobile patient dashboard mirrors the web app style with soft mint backgrounds, rounded cards, and quick booking actions.
        </Text>
      </View>

      <View style={styles.profileChip}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name || "PA").slice(0, 2).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.profileName}>{user?.name || "Patient"}</Text>
          <Text style={styles.profileMeta}>{user?.hospitalId?.name || "Assigned hospital"}</Text>
        </View>
      </View>

      <View style={styles.heroPanel}>
        <View style={styles.heroPanelCopy}>
          <Text style={styles.heroPanelTitle}>Book your appointment directly</Text>
          <Text style={styles.heroPanelText}>
            Pick a doctor, review fees and timings, and continue into appointment booking in the next step.
          </Text>
        </View>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Live doctors</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Quick booking</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Queue ready</Text>
          </View>
        </View>
        <PrimaryButton label="Browse Doctors" onPress={onOpenDoctors} />
      </View>

      <View style={styles.metrics}>
        <MetricCard label="Design" value="Cloned" meta="Web theme matched" />
        <MetricCard label="Doctors" value="Live" meta="API connected next" />
      </View>

      <View style={[appStyles.panel, styles.section]}>
        <Text style={appStyles.sectionTitle}>Patient quick actions</Text>
        <View style={styles.actionGrid}>
          <Pressable style={styles.actionCard} onPress={onOpenDoctors}>
            <Text style={styles.actionTitle}>Doctor list</Text>
            <Text style={styles.actionText}>Browse specialties, consultation fees, and availability details.</Text>
          </Pressable>
          <View style={styles.actionCardMuted}>
            <Text style={styles.actionTitle}>My appointments</Text>
            <Text style={styles.actionText}>Planned next after doctor list and booking flow.</Text>
          </View>
        </View>
      </View>

      <PrimaryButton label="Sign Out" onPress={signOut} />
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
  eyebrow: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    padding: 4,
    paddingRight: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  avatar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.accent,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  profileName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  profileMeta: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "500",
  },
  heroPanel: {
    gap: spacing.md,
    borderRadius: 24,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(95, 183, 180, 0.08)",
    shadowColor: colors.accentStrong,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 4,
  },
  heroPanelCopy: {
    gap: 8,
  },
  heroPanelTitle: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  heroPanelText: {
    ...typography.body,
    color: "#4b5563",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
  },
  badgeText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  actionGrid: {
    gap: spacing.md,
  },
  actionCard: {
    borderRadius: 20,
    padding: spacing.lg,
    backgroundColor: "#eef8f8",
    borderWidth: 1,
    borderColor: "rgba(106, 173, 179, 0.2)",
    gap: 8,
  },
  actionCardMuted: {
    borderRadius: 20,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  actionTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "700",
  },
  actionText: {
    ...typography.bodySmall,
    color: "#5b6770",
  },
});
