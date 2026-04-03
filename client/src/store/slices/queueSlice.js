import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async Thunks
export const fetchQueue = createAsyncThunk(
  'queue/fetch',
  async (doctorId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/queue/${doctorId}/today`);
      return response.data.queue;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch queue');
    }
  }
);

export const fetchPatientQueueStatus = createAsyncThunk(
  'queue/patientStatus',
  async (doctorId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/queue/${doctorId}/patient-status`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch status');
    }
  }
);

export const startQueue = createAsyncThunk(
  'queue/start',
  async (doctorId, { rejectWithValue }) => {
    try {
      const response = await api.put(`/doctors/${doctorId}/queue/start`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start queue');
    }
  }
);

export const callNextPatient = createAsyncThunk(
  'queue/callNext',
  async (doctorId, { rejectWithValue }) => {
    try {
      const response = await api.put(`/queue/${doctorId}/call-next`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to call next');
    }
  }
);

export const completeCurrentPatient = createAsyncThunk(
  'queue/completeCurrent',
  async ({ doctorId, notes }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/queue/${doctorId}/complete-current`, { notes });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to complete');
    }
  }
);

export const skipPatient = createAsyncThunk(
  'queue/skip',
  async ({ doctorId, reason, markAsNoShow }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/queue/${doctorId}/skip-patient`, { reason, markAsNoShow });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to skip');
    }
  }
);

export const addDelay = createAsyncThunk(
  'queue/addDelay',
  async ({ doctorId, delayMinutes, reason }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/queue/${doctorId}/add-delay`, { delayMinutes, reason });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add delay');
    }
  }
);

export const pauseQueue = createAsyncThunk(
  'queue/pause',
  async (doctorId, { rejectWithValue }) => {
    try {
      const response = await api.put(`/queue/${doctorId}/pause`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to pause');
    }
  }
);

export const resumeQueue = createAsyncThunk(
  'queue/resume',
  async (doctorId, { rejectWithValue }) => {
    try {
      const response = await api.put(`/queue/${doctorId}/resume`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to resume');
    }
  }
);

// Initial State
const initialState = {
  current: null,
  patientStatus: null,
  summary: null,
  loading: false,
  error: null,
};

// Slice
const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    clearQueue: (state) => {
      state.current = null;
      state.patientStatus = null;
      state.summary = null;
    },
    updateQueueFromSocket: (state, action) => {
      if (state.current) {
        state.current = { ...state.current, ...action.payload };
      }
      if (action.payload.summary) {
        state.summary = action.payload.summary;
      }
    },
    updatePatientStatusFromSocket: (state, action) => {
      state.patientStatus = { ...state.patientStatus, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Queue
      .addCase(fetchQueue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQueue.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
        state.summary = action.payload.summary;
      })
      .addCase(fetchQueue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Patient Status
      .addCase(fetchPatientQueueStatus.fulfilled, (state, action) => {
        state.patientStatus = action.payload;
      })
      // Start Queue
      .addCase(startQueue.fulfilled, (state, action) => {
        if (state.current) {
          state.current.status = 'active';
        }
        state.summary = action.payload.queue;
      })
      // Call Next
      .addCase(callNextPatient.fulfilled, (state, action) => {
        state.summary = action.payload.summary;
      })
      // Complete Current
      .addCase(completeCurrentPatient.fulfilled, (state, action) => {
        state.summary = action.payload.summary;
      })
      // Skip
      .addCase(skipPatient.fulfilled, (state, action) => {
        state.summary = action.payload.summary;
      })
      // Add Delay
      .addCase(addDelay.fulfilled, (state, action) => {
        if (state.current) {
          state.current.currentDelay = action.payload.currentDelay;
        }
      })
      // Pause
      .addCase(pauseQueue.fulfilled, (state) => {
        if (state.current) {
          state.current.status = 'paused';
        }
      })
      // Resume
      .addCase(resumeQueue.fulfilled, (state, action) => {
        if (state.current) {
          state.current.status = 'active';
        }
        state.summary = action.payload.summary;
      });
  },
});

export const { clearQueue, updateQueueFromSocket, updatePatientStatusFromSocket } = queueSlice.actions;

// Selectors
export const selectQueue = (state) => state.queue.current;
export const selectQueueSummary = (state) => state.queue.summary;
export const selectPatientQueueStatus = (state) => state.queue.patientStatus;
export const selectQueueLoading = (state) => state.queue.loading;

export default queueSlice.reducer;
