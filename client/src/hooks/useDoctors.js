import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  fetchDoctors,
  fetchDoctorById,
  fetchDoctorSlots,
  clearCurrentDoctor,
  clearSlots,
  selectDoctors,
  selectCurrentDoctor,
  selectDoctorSlots,
  selectDoctorsLoading,
  selectSlotsLoading,
} from '../store/slices/doctorSlice';

export const useDoctors = () => {
  const dispatch = useDispatch();
  const doctors = useSelector(selectDoctors);
  const currentDoctor = useSelector(selectCurrentDoctor);
  const slots = useSelector((state) => state.doctors.slots);
  const loading = useSelector(selectDoctorsLoading);
  const slotsLoading = useSelector(selectSlotsLoading);
  const error = useSelector((state) => state.doctors.error);

  const getDoctors = useCallback(
    (params) => dispatch(fetchDoctors(params)),
    [dispatch]
  );

  const getDoctorById = useCallback(
    (id) => dispatch(fetchDoctorById(id)),
    [dispatch]
  );

  const getSlots = useCallback(
    (doctorId, date) => dispatch(fetchDoctorSlots({ doctorId, date })),
    [dispatch]
  );

  const getSlotsForDoctor = useCallback(
    (doctorId, date) => slots[`${doctorId}_${date}`] || [],
    [slots]
  );

  const clearDoctor = useCallback(
    () => dispatch(clearCurrentDoctor()),
    [dispatch]
  );

  const clearAvailableSlots = useCallback(
    () => dispatch(clearSlots()),
    [dispatch]
  );

  return {
    doctors,
    currentDoctor,
    slots,
    loading,
    slotsLoading,
    error,
    getDoctors,
    getDoctorById,
    getSlots,
    getSlotsForDoctor,
    clearDoctor,
    clearAvailableSlots,
  };
};

export default useDoctors;
