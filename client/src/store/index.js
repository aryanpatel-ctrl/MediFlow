import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import appointmentReducer from './slices/appointmentSlice';
import queueReducer from './slices/queueSlice';
import doctorReducer from './slices/doctorSlice';
import hospitalReducer from './slices/hospitalSlice';
import chatReducer from './slices/chatSlice';
import notificationReducer from './slices/notificationSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    appointments: appointmentReducer,
    queue: queueReducer,
    doctors: doctorReducer,
    hospitals: hospitalReducer,
    chat: chatReducer,
    notifications: notificationReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['socket/connect'],
        ignoredPaths: ['socket.instance'],
      },
    }),
  devTools: import.meta.env.DEV,
});

export default store;
