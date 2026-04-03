import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  login as loginAction,
  register as registerAction,
  logout as logoutAction,
  loadUser,
  updateProfile as updateProfileAction,
  sendOTP as sendOTPAction,
  verifyOTP as verifyOTPAction,
  clearError,
  resetOTPState,
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
} from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const otpSent = useSelector((state) => state.auth.otpSent);
  const otpVerified = useSelector((state) => state.auth.otpVerified);

  const login = useCallback(
    (email, password) => dispatch(loginAction({ email, password })),
    [dispatch]
  );

  const register = useCallback(
    (userData) => dispatch(registerAction(userData)),
    [dispatch]
  );

  const logout = useCallback(() => dispatch(logoutAction()), [dispatch]);

  const checkAuth = useCallback(() => dispatch(loadUser()), [dispatch]);

  const updateProfile = useCallback(
    (data) => dispatch(updateProfileAction(data)),
    [dispatch]
  );

  const sendOTP = useCallback(
    (phone, purpose) => dispatch(sendOTPAction({ phone, purpose })),
    [dispatch]
  );

  const verifyOTP = useCallback(
    (phone, code, purpose) => dispatch(verifyOTPAction({ phone, code, purpose })),
    [dispatch]
  );

  const clearAuthError = useCallback(() => dispatch(clearError()), [dispatch]);

  const resetOTP = useCallback(() => dispatch(resetOTPState()), [dispatch]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    otpSent,
    otpVerified,
    login,
    register,
    logout,
    checkAuth,
    updateProfile,
    sendOTP,
    verifyOTP,
    clearAuthError,
    resetOTP,
  };
};

export default useAuth;
