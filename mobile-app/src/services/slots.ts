import { api } from "../lib/api";

export type SlotRecord = {
  time: string;
  available: boolean;
};

export async function getDoctorSlots(doctorId: string, date: string) {
  const response = await api.get<{ slots: SlotRecord[] }>(`/doctors/${doctorId}/slots`, {
    params: { date },
  });

  return response.data.slots || [];
}
