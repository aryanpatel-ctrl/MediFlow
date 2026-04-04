import { api } from "../lib/api";

const DEFAULT_APPOINTMENT_TYPES = ["Consultation", "Follow-up", "Surgery", "Telemedicine"];

export async function getHospitalAppointmentTypes(hospitalId: string) {
  const response = await api.get<{ hospital?: { appointmentTypes?: string[] } }>(`/hospitals/${hospitalId}`);
  const values = response.data.hospital?.appointmentTypes;

  if (!Array.isArray(values) || values.length === 0) {
    return DEFAULT_APPOINTMENT_TYPES;
  }

  return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];
}
