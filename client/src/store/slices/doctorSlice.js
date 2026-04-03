import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async Thunks
export const fetchDoctors = createAsyncThunk(
  'doctors/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { hospitalId, specialty } = params;
      const url = hospitalId
        ? `/hospitals/${hospitalId}/doctors`
        : '/doctors';
      const response = await api.get(url, { params: { specialty } });
      return response.data.doctors;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch doctors');
    }
  }
);

export const fetchDoctorById = createAsyncThunk(
  'doctors/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/doctors/${id}`);
      return response.data.doctor;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch doctor');
    }
  }
);

export const fetchDoctorSlots = createAsyncThunk(
  'doctors/fetchSlots',
  async ({ doctorId, date }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/doctors/${doctorId}/slots`, { params: { date } });
      return { doctorId, date, slots: response.data.slots };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch slots');
    }
  }
);

export const onboardDoctor = createAsyncThunk(
  'doctors/onboard',
  async (doctorData, { rejectWithValue }) => {
    try {
      const response = await api.post('/doctors/onboard', doctorData);
      return response.data.doctor;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to onboard doctor');
    }
  }
);

export const updateDoctor = createAsyncThunk(
  'doctors/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/doctors/${id}`, data);
      return response.data.doctor;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update doctor');
    }
  }
);

export const blockDoctorDate = createAsyncThunk(
  'doctors/blockDate',
  async ({ doctorId, date, reason }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/doctors/${doctorId}/block-date`, { date, reason });
      return { doctorId, blockedDates: response.data.blockedDates };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to block date');
    }
  }
);

// Initial State
const initialState = {
  list: [],
  current: null,
  slots: {},
  loading: false,
  slotsLoading: false,
  error: null,
};

// Slice
const doctorSlice = createSlice({
  name: 'doctors',
  initialState,
  reducers: {
    clearCurrentDoctor: (state) => {
      state.current = null;
    },
    clearSlots: (state) => {
      state.slots = {};
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchDoctors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDoctors.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchDoctors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By ID
      .addCase(fetchDoctorById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDoctorById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(fetchDoctorById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Slots
      .addCase(fetchDoctorSlots.pending, (state) => {
        state.slotsLoading = true;
      })
      .addCase(fetchDoctorSlots.fulfilled, (state, action) => {
        state.slotsLoading = false;
        const key = `${action.payload.doctorId}_${action.payload.date}`;
        state.slots[key] = action.payload.slots;
      })
      .addCase(fetchDoctorSlots.rejected, (state, action) => {
        state.slotsLoading = false;
        state.error = action.payload;
      })
      // Onboard
      .addCase(onboardDoctor.pending, (state) => {
        state.loading = true;
      })
      .addCase(onboardDoctor.fulfilled, (state, action) => {
        state.loading = false;
        state.list.push(action.payload);
      })
      .addCase(onboardDoctor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateDoctor.fulfilled, (state, action) => {
        const index = state.list.findIndex((d) => d._id === action.payload._id);
        if (index !== -1) state.list[index] = action.payload;
        if (state.current?._id === action.payload._id) state.current = action.payload;
      })
      // Block Date
      .addCase(blockDoctorDate.fulfilled, (state, action) => {
        const doctor = state.list.find((d) => d._id === action.payload.doctorId);
        if (doctor) doctor.blockedDates = action.payload.blockedDates;
        if (state.current?._id === action.payload.doctorId) {
          state.current.blockedDates = action.payload.blockedDates;
        }
      });
  },
});

export const { clearCurrentDoctor, clearSlots, clearError } = doctorSlice.actions;

// Selectors
export const selectDoctors = (state) => state.doctors.list;
export const selectCurrentDoctor = (state) => state.doctors.current;
export const selectDoctorSlots = (doctorId, date) => (state) =>
  state.doctors.slots[`${doctorId}_${date}`] || [];
export const selectDoctorsLoading = (state) => state.doctors.loading;
export const selectSlotsLoading = (state) => state.doctors.slotsLoading;

export default doctorSlice.reducer;
