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
import { DoctorRecord } from "../../../services/doctors";
import { getHospitalAppointmentTypes } from "../../../services/hospitals";
import { createAppointment } from "../../../services/appointments";
import { getDoctorSlots, SlotRecord } from "../../../services/slots";
import { useAuth } from "../../auth/AuthContext";
import { appStyles } from "../../../theme/styles";
import { colors, radius, spacing, typography } from "../../../theme/tokens";

type Props = {
  doctor: DoctorRecord;
  onBack: () => void;
  onBooked: () => void;
};

function nextSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date.toISOString().split("T")[0];
  });
}

function formatDateLabel(dateValue: string) {
  const date = new Date(dateValue);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const todayKey = today.toISOString().split("T")[0];
  const tomorrowKey = tomorrow.toISOString().split("T")[0];

  if (dateValue === todayKey) return "Today";
  if (dateValue === tomorrowKey) return "Tomorrow";

  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function BookAppointmentScreen({ doctor, onBack, onBooked }: Props) {
  const { user } = useAuth();
  const hospitalId = typeof user?.hospitalId === "string" ? user.hospitalId : user?.hospitalId?._id;
  const dates = useMemo(() => nextSevenDays(), []);
  const [appointmentTypes, setAppointmentTypes] = useState<string[]>(["Consultation"]);
  const [selectedDate, setSelectedDate] = useState(dates[0] || "");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<SlotRecord[]>([]);
  const [appointmentType, setAppointmentType] = useState("Consultation");
  const [notes, setNotes] = useState("");
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    async function loadTypes() {
      if (!hospitalId) {
        setLoadingTypes(false);
        return;
      }

      try {
        const types = await getHospitalAppointmentTypes(hospitalId);
        setAppointmentTypes(types);
        setAppointmentType(types[0] || "Consultation");
      } finally {
        setLoadingTypes(false);
      }
    }

    loadTypes();
  }, [hospitalId]);

  useEffect(() => {
    async function loadSlots() {
      if (!doctor._id || !selectedDate) {
        return;
      }

      setLoadingSlots(true);
      setSelectedSlot("");
      try {
        const nextSlots = await getDoctorSlots(doctor._id, selectedDate);
        setSlots(nextSlots.filter((slot) => slot.available));
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [doctor._id, selectedDate]);

  async function handleBook() {
    if (!selectedDate || !selectedSlot) {
      Alert.alert("Missing slot", "Please select a date and time slot.");
      return;
    }

    setBooking(true);
    try {
      await createAppointment({
        doctorId: doctor._id,
        date: selectedDate,
        slotTime: selectedSlot,
        appointmentType,
        triageData: notes.trim() ? { preVisitSummary: notes.trim() } : undefined,
        bookingSource: "manual",
      });
      Alert.alert("Appointment booked", "Your appointment has been created successfully.", [
        { text: "Continue", onPress: onBooked },
      ]);
    } catch (error: any) {
      Alert.alert("Booking failed", error?.response?.data?.message || "Unable to book appointment.");
    } finally {
      setBooking(false);
    }
  }

  return (
    <AppContainer scroll contentStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Appointment Details</Text>
          <Text style={appStyles.title}>Book your appointment directly</Text>
          <Text style={appStyles.subtitle}>
            Pick the type, date, and slot, then confirm against the live hospital backend.
          </Text>
        </View>
      </View>

      <View style={[appStyles.panel, styles.selectedDoctorCard]}>
        <Text style={styles.doctorName}>{doctor.userId?.name || "Doctor"}</Text>
        <Text style={styles.doctorMeta}>
          {doctor.specialty || "General Medicine"} • ₹{doctor.consultationFee || 0}
        </Text>
      </View>

      <View style={[appStyles.panel, styles.formPanel]}>
        <Text style={appStyles.sectionTitle}>Appointment Type</Text>
        {loadingTypes ? (
          <ActivityIndicator color={colors.accentStrong} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {appointmentTypes.map((type) => {
              const active = type === appointmentType;
              return (
                <Pressable
                  key={type}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setAppointmentType(type)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{type}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Text style={appStyles.sectionTitle}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {dates.map((date) => {
            const active = date === selectedDate;
            return (
              <Pressable
                key={date}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{formatDateLabel(date)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={appStyles.sectionTitle}>Available Slots</Text>
        {loadingSlots ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.accentStrong} />
            <Text style={styles.helperText}>Loading slots...</Text>
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No slots available for this date</Text>
            <Text style={styles.helperText}>Try another day from the date selector above.</Text>
          </View>
        ) : (
          <View style={styles.slotGrid}>
            {slots.map((slot) => {
              const active = slot.time === selectedSlot;
              return (
                <Pressable
                  key={slot.time}
                  style={[styles.slotButton, active && styles.slotButtonActive]}
                  onPress={() => setSelectedSlot(slot.time)}
                >
                  <Text style={[styles.slotText, active && styles.slotTextActive]}>{slot.time}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={appStyles.sectionTitle}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          placeholder="Add symptoms or a short reason for the visit"
          placeholderTextColor="#6b7280"
          style={styles.notesInput}
        />

        <PrimaryButton label="Confirm Appointment" onPress={handleBook} loading={booking} />
      </View>
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
  selectedDoctorCard: {
    gap: 4,
    backgroundColor: "#f4fbfb",
    borderColor: "rgba(106, 173, 179, 0.2)",
  },
  doctorName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  doctorMeta: {
    color: colors.textSoft,
    fontSize: 14,
  },
  formPanel: {
    gap: spacing.md,
  },
  chipRow: {
    gap: 10,
    paddingRight: 6,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: "#eef8f8",
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.accentStrong,
  },
  loadingWrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.textSoft,
    textAlign: "center",
  },
  emptyCard: {
    borderRadius: 18,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  slotButton: {
    minWidth: 92,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotButtonActive: {
    backgroundColor: "#eef8f8",
    borderColor: colors.accent,
  },
  slotText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  slotTextActive: {
    color: colors.accentStrong,
  },
  notesInput: {
    minHeight: 110,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
  },
});
