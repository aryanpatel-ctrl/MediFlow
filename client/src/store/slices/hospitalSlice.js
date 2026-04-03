import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async Thunks
export const fetchHospitals = createAsyncThunk(
  'hospitals/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/hospitals', { params });
      return response.data.hospitals;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch hospitals');
    }
  }
);

export const fetchHospitalById = createAsyncThunk(
  'hospitals/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/hospitals/${id}`);
      return response.data.hospital;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch hospital');
    }
  }
);

export const fetchHospitalStats = createAsyncThunk(
  'hospitals/fetchStats',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/hospitals/${id}/stats`);
      return response.data.stats;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

export const updateHospital = createAsyncThunk(
  'hospitals/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/hospitals/${id}`, data);
      return response.data.hospital;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update hospital');
    }
  }
);

export const onboardHospital = createAsyncThunk(
  'hospitals/onboard',
  async (hospitalData, { rejectWithValue }) => {
    try {
      const response = await api.post('/hospitals/onboard', hospitalData);
      return response.data.hospital;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to onboard hospital');
    }
  }
);

// Initial State
const initialState = {
  list: [],
  current: null,
  stats: null,
  loading: false,
  error: null,
};

// Slice
const hospitalSlice = createSlice({
  name: 'hospitals',
  initialState,
  reducers: {
    clearCurrentHospital: (state) => {
      state.current = null;
      state.stats = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchHospitals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHospitals.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchHospitals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By ID
      .addCase(fetchHospitalById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchHospitalById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(fetchHospitalById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Stats
      .addCase(fetchHospitalStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      // Update
      .addCase(updateHospital.fulfilled, (state, action) => {
        const index = state.list.findIndex((h) => h._id === action.payload._id);
        if (index !== -1) state.list[index] = action.payload;
        if (state.current?._id === action.payload._id) state.current = action.payload;
      })
      // Onboard
      .addCase(onboardHospital.fulfilled, (state, action) => {
        state.list.push(action.payload);
      });
  },
});

export const { clearCurrentHospital, clearError } = hospitalSlice.actions;

// Selectors
export const selectHospitals = (state) => state.hospitals.list;
export const selectCurrentHospital = (state) => state.hospitals.current;
export const selectHospitalStats = (state) => state.hospitals.stats;
export const selectHospitalsLoading = (state) => state.hospitals.loading;

export default hospitalSlice.reducer;
