import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "./useAuth";

const DEFAULT_APPOINTMENT_TYPES = ["Consultation", "Follow-up", "Surgery", "Telemedicine"];
const DEFAULT_INVENTORY_CATEGORIES = ["Medicines", "Equipment", "Supplies"];
const DEFAULT_SPECIALTIES = ["General Medicine"];

const normalizeItems = (items, fallback) => {
  const values = Array.isArray(items) ? items : fallback;
  const uniqueValues = [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];
  return uniqueValues.length ? uniqueValues : fallback;
};

export function useHospitalSettings(hospitalIdOverride) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    appointmentTypes: DEFAULT_APPOINTMENT_TYPES,
    inventoryCategories: DEFAULT_INVENTORY_CATEGORIES,
    specialties: DEFAULT_SPECIALTIES,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hospitalId = hospitalIdOverride || user?.hospitalId?._id || user?.hospitalId;

    if (!hospitalId) {
      setSettings({
        appointmentTypes: DEFAULT_APPOINTMENT_TYPES,
        inventoryCategories: DEFAULT_INVENTORY_CATEGORIES,
        specialties: DEFAULT_SPECIALTIES,
      });
      return;
    }

    let isCancelled = false;

    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/hospitals/${hospitalId}`);
        const hospital = res.data.hospital || {};

        if (!isCancelled) {
          setSettings({
            appointmentTypes: normalizeItems(hospital.appointmentTypes, DEFAULT_APPOINTMENT_TYPES),
            inventoryCategories: normalizeItems(hospital.inventoryCategories, DEFAULT_INVENTORY_CATEGORIES),
            specialties: normalizeItems(hospital.specialties, DEFAULT_SPECIALTIES),
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setSettings({
            appointmentTypes: DEFAULT_APPOINTMENT_TYPES,
            inventoryCategories: DEFAULT_INVENTORY_CATEGORIES,
            specialties: DEFAULT_SPECIALTIES,
          });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      isCancelled = true;
    };
  }, [hospitalIdOverride, user]);

  return {
    ...settings,
    loading,
  };
}

export default useHospitalSettings;
