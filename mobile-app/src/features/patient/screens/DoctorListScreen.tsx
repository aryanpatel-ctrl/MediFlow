import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppContainer } from "../../../components/AppContainer";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { useAuth } from "../../auth/AuthContext";
import { DoctorRecord, getHospitalDoctors } from "../../../services/doctors";
import { appStyles } from "../../../theme/styles";
import { colors, radius, spacing, typography } from "../../../theme/tokens";

type Props = {
  onBack: () => void;
  onSelectDoctor: (doctor: DoctorRecord) => void;
  onContinueToBooking?: (doctor: DoctorRecord) => void;
  selectedDoctorId?: string;
  initialDoctor?: DoctorRecord;
};

function formatCurrency(value?: number) {
  return `₹${value || 0}`;
}

function formatExperience(value?: number) {
  if (!value && value !== 0) return "Experience not set";
  return `${value} years experience`;
}

export function DoctorListScreen({
  onBack,
  onSelectDoctor,
  onContinueToBooking,
  selectedDoctorId,
  initialDoctor,
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRecord | null>(initialDoctor || null);
  const hospitalId =
    typeof user?.hospitalId === "string" ? user.hospitalId : user?.hospitalId?._id;

  useEffect(() => {
    async function loadDoctors() {
      if (!hospitalId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const nextDoctors = await getHospitalDoctors(hospitalId);
        const sortedDoctors = [...nextDoctors].sort((left, right) =>
          (left.userId?.name || "Doctor").localeCompare(right.userId?.name || "Doctor"),
        );
        setDoctors(sortedDoctors);
        if (selectedDoctorId) {
          const match = sortedDoctors.find((doctor) => doctor._id === selectedDoctorId);
          setSelectedDoctor(match || initialDoctor || sortedDoctors[0] || null);
        } else {
          setSelectedDoctor((current) => current || sortedDoctors[0] || null);
        }
      } catch (_error) {
        setError("Failed to load doctors from the hospital API.");
      } finally {
        setLoading(false);
      }
    }

    loadDoctors();
  }, [hospitalId, selectedDoctorId, initialDoctor]);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return doctors;

    return doctors.filter((doctor) => {
      const values = [
        doctor.userId?.name || "",
        doctor.specialty || "",
        doctor.qualification || "",
      ];
      return values.some((value) => value.toLowerCase().includes(query));
    });
  }, [doctors, search]);

  useEffect(() => {
    if (!filteredDoctors.length) {
      setSelectedDoctor(null);
      return;
    }

    setSelectedDoctor((current) => {
      if (!current) return filteredDoctors[0];
      return filteredDoctors.find((doctor) => doctor._id === current._id) || filteredDoctors[0];
    });
  }, [filteredDoctors]);

  return (
    <AppContainer scroll contentStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Manual Booking</Text>
          <Text style={appStyles.title}>Select Doctor</Text>
          <Text style={appStyles.subtitle}>
            This mirrors the web booking screen with a doctor list panel and a focused detail card.
          </Text>
        </View>
      </View>

      <View style={styles.heroPanel}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{filteredDoctors.length} doctors</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Live slots</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Instant confirmation</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search doctor, specialty, or qualification"
          placeholderTextColor="#6b7280"
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={[appStyles.panel, styles.centerState]}>
          <ActivityIndicator size="large" color={colors.accentStrong} />
          <Text style={styles.stateText}>Loading doctors...</Text>
        </View>
      ) : error ? (
        <View style={[appStyles.panel, styles.centerState]}>
          <Text style={styles.stateTitle}>Unable to load doctors</Text>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : !filteredDoctors.length ? (
        <View style={[appStyles.panel, styles.centerState]}>
          <Text style={styles.stateTitle}>No doctors available right now.</Text>
          <Text style={styles.stateText}>Try a different search or check the hospital setup.</Text>
        </View>
      ) : (
        <>
          <View style={[appStyles.panel, styles.listPanel]}>
            <Text style={appStyles.sectionTitle}>Doctor List</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRail}>
              {filteredDoctors.map((doctor) => {
                const active = doctor._id === selectedDoctor?._id;
                return (
                  <Pressable
                    key={doctor._id}
                    style={[styles.doctorCard, active && styles.doctorCardActive]}
                    onPress={() => {
                      setSelectedDoctor(doctor);
                      onSelectDoctor(doctor);
                    }}
                  >
                    <View style={styles.cardTop}>
                      <Text style={styles.cardName}>{doctor.userId?.name || "Doctor"}</Text>
                      <Text style={styles.cardSpecialty}>{doctor.specialty || "General Medicine"}</Text>
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardMetaText}>{formatCurrency(doctor.consultationFee)}</Text>
                      <Text style={styles.cardMetaText}>{doctor.slotDuration || 15} min</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {selectedDoctor ? (
            <View style={[appStyles.panel, styles.detailPanel]}>
              <Text style={appStyles.sectionTitle}>Appointment Details</Text>
              <View style={styles.selectedDoctorCard}>
                <Text style={styles.detailName}>{selectedDoctor.userId?.name || "Doctor"}</Text>
                <Text style={styles.detailSubtitle}>
                  {selectedDoctor.specialty || "General Medicine"} • {formatCurrency(selectedDoctor.consultationFee)}
                </Text>
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Qualification</Text>
                  <Text style={styles.detailValue}>{selectedDoctor.qualification || "Not available"}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Experience</Text>
                  <Text style={styles.detailValue}>{formatExperience(selectedDoctor.experience)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Consultation Fee</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedDoctor.consultationFee)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Slot Duration</Text>
                  <Text style={styles.detailValue}>{selectedDoctor.slotDuration || 15} minutes</Text>
                </View>
              </View>

              <View style={styles.contactCard}>
                <Text style={styles.contactTitle}>Doctor contact</Text>
                <Text style={styles.contactText}>{selectedDoctor.userId?.email || "Email not available"}</Text>
                <Text style={styles.contactText}>{selectedDoctor.userId?.phone || "Phone not available"}</Text>
              </View>

              <PrimaryButton
                label="Continue To Booking"
                onPress={() => {
                  if (onContinueToBooking) {
                    onContinueToBooking(selectedDoctor);
                    return;
                  }

                  Alert.alert("Next phase", "Booking screen is the next patient screen to build.");
                }}
              />
            </View>
          ) : null}
        </>
      )}
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  headerRow: {
    gap: spacing.md,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  headerCopy: {
    gap: 8,
  },
  eyebrow: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroPanel: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(95, 183, 180, 0.08)",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
  },
  badgeText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
  searchWrap: {
    borderRadius: radius.lg,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  centerState: {
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 220,
    justifyContent: "center",
  },
  stateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  stateText: {
    ...typography.bodySmall,
    color: colors.textSoft,
    textAlign: "center",
  },
  listPanel: {
    gap: spacing.md,
  },
  cardRail: {
    gap: 14,
    paddingRight: 6,
  },
  doctorCard: {
    width: 250,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    padding: 18,
  },
  doctorCardActive: {
    borderColor: colors.accent,
    backgroundColor: "#eef8f8",
    shadowColor: colors.accentStrong,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 3,
  },
  cardTop: {
    gap: 4,
  },
  cardName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  cardSpecialty: {
    color: colors.textSoft,
    fontSize: 14,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
  },
  cardMetaText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  detailPanel: {
    gap: spacing.md,
  },
  selectedDoctorCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#f4fbfb",
    borderWidth: 1,
    borderColor: "rgba(106, 173, 179, 0.2)",
    gap: 4,
  },
  detailName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  detailSubtitle: {
    color: colors.textSoft,
    fontSize: 14,
  },
  detailGrid: {
    gap: spacing.md,
  },
  detailItem: {
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  detailLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  detailValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  contactCard: {
    borderRadius: 18,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  contactTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
  },
  contactText: {
    color: "#5b6770",
    fontSize: 14,
  },
});
