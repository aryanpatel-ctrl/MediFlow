import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async Thunks
export const fetchAppointments = createAsyncThunk(
  'appointments/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/appointments', { params });
      return response.data.appointments;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch appointments');
    }
  }
);

export const fetchAppointmentById = createAsyncThunk(
  'appointments/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/appointments/${id}`);
      return response.data.appointment;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch appointment');
    }
  }
);

export const createAppointment = createAsyncThunk(
  'appointments/create',
  async (appointmentData, { rejectWithValue }) => {
    try {
      const response = await api.post('/appointments', appointmentData);
      return response.data.appointment;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create appointment');
    }
  }
);

export const checkInAppointment = createAsyncThunk(
  'appointments/checkIn',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.put(`/appointments/${id}/check-in`);
      return response.data.appointment;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to check in');
    }
  }
);

export const cancelAppointment = createAsyncThunk(
  'appointments/cancel',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/appointments/${id}/cancel`, { reason });
      return response.data.appointment;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel appointment');
    }
  }
);

export const rescheduleAppointment = createAsyncThunk(
  'appointments/reschedule',
  async ({ id, newDate, newSlotTime, reason }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/appointments/${id}/reschedule`, {
        newDate,
        newSlotTime,
        reason,
      });
      return {
        oldAppointment: response.data.oldAppointment,
        newAppointment: response.data.newAppointment,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reschedule');
    }
  }
);

export const submitFeedback = createAsyncThunk(
  'appointments/feedback',
  async ({ id, rating, comment }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/appointments/${id}/feedback`, { rating, comment });
      return { id, feedback: response.data.feedback };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit feedback');
    }
  }
);

// Initial State
const initialState = {
  list: [],
  current: null,
  upcoming: [],
  loading: false,
  error: null,
};

// Slice
const appointmentSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    clearCurrentAppointment: (state) => {
      state.current = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateAppointmentInList: (state, action) => {
      const index = state.list.findIndex((a) => a._id === action.payload._id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.upcoming = action.payload.filter(
          (a) => !['cancelled', 'completed', 'no_show'].includes(a.status)
        );
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By ID
      .addCase(fetchAppointmentById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAppointmentById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(fetchAppointmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createAppointment.pending, (state) => {
        state.loading = true;
      })
      .addCase(createAppointment.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload);
        state.current = action.payload;
      })
      .addCase(createAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Check In
      .addCase(checkInAppointment.fulfilled, (state, action) => {
        const index = state.list.findIndex((a) => a._id === action.payload._id);
        if (index !== -1) state.list[index] = action.payload;
        if (state.current?._id === action.payload._id) state.current = action.payload;
      })
      // Cancel
      .addCase(cancelAppointment.fulfilled, (state, action) => {
        const index = state.list.findIndex((a) => a._id === action.payload._id);
        if (index !== -1) state.list[index] = action.payload;
        if (state.current?._id === action.payload._id) state.current = action.payload;
      })
      // Reschedule
      .addCase(rescheduleAppointment.fulfilled, (state, action) => {
        const oldIndex = state.list.findIndex((a) => a._id === action.payload.oldAppointment._id);
        if (oldIndex !== -1) state.list[oldIndex] = action.payload.oldAppointment;
        state.list.unshift(action.payload.newAppointment);
      })
      // Feedback
      .addCase(submitFeedback.fulfilled, (state, action) => {
        const index = state.list.findIndex((a) => a._id === action.payload.id);
        if (index !== -1) state.list[index].feedback = action.payload.feedback;
      });
  },
});

export const { clearCurrentAppointment, clearError, updateAppointmentInList } = appointmentSlice.actions;

// Selectors
export const selectAppointments = (state) => state.appointments.list;
export const selectUpcomingAppointments = (state) => state.appointments.upcoming;
export const selectCurrentAppointment = (state) => state.appointments.current;
export const selectAppointmentsLoading = (state) => state.appointments.loading;

export default appointmentSlice.reducer;
