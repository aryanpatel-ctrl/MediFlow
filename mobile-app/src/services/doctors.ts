import { api } from "../lib/api";

export type DoctorRecord = {
  _id: string;
  specialty?: string;
  qualification?: string;
  experience?: number;
  consultationFee?: number;
  rating?: number;
  slotDuration?: number;
  userId?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

export async function getHospitalDoctors(hospitalId: string) {
  const response = await api.get<{ doctors: DoctorRecord[] }>(`/hospitals/${hospitalId}/doctors`);
  return response.data.doctors || [];
}
