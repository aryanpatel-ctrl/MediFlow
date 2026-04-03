import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  fetchHospitals,
  fetchHospitalById,
  clearCurrentHospital,
  selectHospitals,
  selectCurrentHospital,
  selectHospitalsLoading,
} from '../store/slices/hospitalSlice';

export const useHospitals = () => {
  const dispatch = useDispatch();
  const hospitals = useSelector(selectHospitals);
  const currentHospital = useSelector(selectCurrentHospital);
  const loading = useSelector(selectHospitalsLoading);
  const error = useSelector((state) => state.hospitals.error);

  const getHospitals = useCallback(
    (params) => dispatch(fetchHospitals(params)),
    [dispatch]
  );

  const getHospitalById = useCallback(
    (id) => dispatch(fetchHospitalById(id)),
    [dispatch]
  );

  const clearHospital = useCallback(
    () => dispatch(clearCurrentHospital()),
    [dispatch]
  );

  return {
    hospitals,
    currentHospital,
    loading,
    error,
    getHospitals,
    getHospitalById,
    clearHospital,
  };
};

export default useHospitals;
