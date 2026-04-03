import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  fetchAppointments,
  fetchAppointmentById,
  createAppointment,
  checkInAppointment,
  cancelAppointment,
  rescheduleAppointment,
  submitFeedback,
  clearCurrentAppointment,
  clearError,
  selectAppointments,
  selectUpcomingAppointments,
  selectCurrentAppointment,
  selectAppointmentsLoading,
} from '../store/slices/appointmentSlice';

export const useAppointments = () => {
  const dispatch = useDispatch();
  const appointments = useSelector(selectAppointments);
  const upcoming = useSelector(selectUpcomingAppointments);
  const current = useSelector(selectCurrentAppointment);
  const loading = useSelector(selectAppointmentsLoading);
  const error = useSelector((state) => state.appointments.error);

  const getAppointments = useCallback(
    (params) => dispatch(fetchAppointments(params)),
    [dispatch]
  );

  const getAppointmentById = useCallback(
    (id) => dispatch(fetchAppointmentById(id)),
    [dispatch]
  );

  const create = useCallback(
    (data) => dispatch(createAppointment(data)),
    [dispatch]
  );

  const checkIn = useCallback(
    (id) => dispatch(checkInAppointment(id)),
    [dispatch]
  );

  const cancel = useCallback(
    (id, reason) => dispatch(cancelAppointment({ id, reason })),
    [dispatch]
  );

  const reschedule = useCallback(
    (id, newDate, newSlotTime, reason) =>
      dispatch(rescheduleAppointment({ id, newDate, newSlotTime, reason })),
    [dispatch]
  );

  const giveFeedback = useCallback(
    (id, rating, comment) => dispatch(submitFeedback({ id, rating, comment })),
    [dispatch]
  );

  const clearCurrent = useCallback(
    () => dispatch(clearCurrentAppointment()),
    [dispatch]
  );

  const clearAppointmentError = useCallback(
    () => dispatch(clearError()),
    [dispatch]
  );

  return {
    appointments,
    upcoming,
    current,
    loading,
    error,
    getAppointments,
    getAppointmentById,
    create,
    checkIn,
    cancel,
    reschedule,
    giveFeedback,
    clearCurrent,
    clearAppointmentError,
  };
};

export default useAppointments;
