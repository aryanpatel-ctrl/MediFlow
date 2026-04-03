import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  fetchQueue,
  fetchPatientQueueStatus,
  startQueue,
  callNextPatient,
  completeCurrentPatient,
  skipPatient,
  addDelay,
  pauseQueue,
  resumeQueue,
  clearQueue,
  selectQueue,
  selectQueueSummary,
  selectPatientQueueStatus,
  selectQueueLoading,
} from '../store/slices/queueSlice';

export const useQueue = () => {
  const dispatch = useDispatch();
  const queue = useSelector(selectQueue);
  const summary = useSelector(selectQueueSummary);
  const patientStatus = useSelector(selectPatientQueueStatus);
  const loading = useSelector(selectQueueLoading);
  const error = useSelector((state) => state.queue.error);

  const getQueue = useCallback(
    (doctorId) => dispatch(fetchQueue(doctorId)),
    [dispatch]
  );

  const getPatientStatus = useCallback(
    (doctorId) => dispatch(fetchPatientQueueStatus(doctorId)),
    [dispatch]
  );

  const start = useCallback(
    (doctorId) => dispatch(startQueue(doctorId)),
    [dispatch]
  );

  const callNext = useCallback(
    (doctorId) => dispatch(callNextPatient(doctorId)),
    [dispatch]
  );

  const completeCurrent = useCallback(
    (doctorId, notes) => dispatch(completeCurrentPatient({ doctorId, notes })),
    [dispatch]
  );

  const skip = useCallback(
    (doctorId, reason, markAsNoShow) =>
      dispatch(skipPatient({ doctorId, reason, markAsNoShow })),
    [dispatch]
  );

  const addQueueDelay = useCallback(
    (doctorId, delayMinutes, reason) =>
      dispatch(addDelay({ doctorId, delayMinutes, reason })),
    [dispatch]
  );

  const pause = useCallback(
    (doctorId) => dispatch(pauseQueue(doctorId)),
    [dispatch]
  );

  const resume = useCallback(
    (doctorId) => dispatch(resumeQueue(doctorId)),
    [dispatch]
  );

  const clear = useCallback(() => dispatch(clearQueue()), [dispatch]);

  return {
    queue,
    summary,
    patientStatus,
    loading,
    error,
    getQueue,
    getPatientStatus,
    start,
    callNext,
    completeCurrent,
    skip,
    addQueueDelay,
    pause,
    resume,
    clear,
  };
};

export default useQueue;
