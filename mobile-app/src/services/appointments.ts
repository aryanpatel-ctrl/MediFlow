import { api } from "../lib/api";

export type AppointmentRecord = {
  _id: string;
  date: string;
  slotTime: string;
  status: string;
};

export async function createAppointment(payload: {
  doctorId: string;
  date: string;
  slotTime: string;
  appointmentType: string;
  triageData?: {
    preVisitSummary?: string;
  };
  bookingSource?: string;
}) {
  const response = await api.post<{ appointment: AppointmentRecord }>("/appointments", payload);
  return response.data.appointment;
}

export async function getMyAppointments(params?: { upcoming?: boolean }) {
  const response = await api.get<{ appointments: AppointmentRecord[] }>("/appointments", {
    params: params?.upcoming ? { upcoming: "true" } : undefined,
  });
  return response.data.appointments || [];
}
