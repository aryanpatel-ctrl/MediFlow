import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async Thunks
export const startChatSession = createAsyncThunk(
  'chat/startSession',
  async (sessionType = 'web_chat', { rejectWithValue }) => {
    try {
      const response = await api.post('/chat/start', { sessionType });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start chat');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ sessionId, message }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/chat/${sessionId}/message`, { message });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const fetchRecommendedDoctors = createAsyncThunk(
  'chat/fetchDoctors',
  async ({ sessionId, hospitalId, date }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/chat/${sessionId}/doctors`, {
        params: { hospitalId, date },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch doctors');
    }
  }
);

export const bookFromChat = createAsyncThunk(
  'chat/book',
  async ({ sessionId, doctorId, date, slotTime }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/chat/${sessionId}/book`, {
        doctorId,
        date,
        slotTime,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to book appointment');
    }
  }
);

// Initial State
const initialState = {
  sessionId: null,
  messages: [],
  triageResult: null,
  triageComplete: false,
  recommendedDoctors: [],
  bookedAppointment: null,
  isTyping: false,
  loading: false,
  error: null,
};

// Slice
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    resetChat: () => initialState,
    addUserMessage: (state, action) => {
      state.messages.push({
        role: 'user',
        content: action.payload,
        timestamp: new Date().toISOString(),
      });
    },
    setTyping: (state, action) => {
      state.isTyping = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Start Session
      .addCase(startChatSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startChatSession.fulfilled, (state, action) => {
        state.loading = false;
        state.sessionId = action.payload.sessionId;
        state.messages = [
          {
            role: 'assistant',
            content: action.payload.greeting,
            timestamp: new Date().toISOString(),
          },
        ];
      })
      .addCase(startChatSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Send Message
      .addCase(sendMessage.pending, (state) => {
        state.isTyping = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isTyping = false;
        state.messages.push({
          role: 'assistant',
          content: action.payload.response,
          timestamp: new Date().toISOString(),
        });
        if (action.payload.triageComplete) {
          state.triageComplete = true;
          state.triageResult = action.payload.triageResult;
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isTyping = false;
        state.error = action.payload;
      })
      // Fetch Recommended Doctors
      .addCase(fetchRecommendedDoctors.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRecommendedDoctors.fulfilled, (state, action) => {
        state.loading = false;
        state.recommendedDoctors = action.payload.doctors;
      })
      .addCase(fetchRecommendedDoctors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Book from Chat
      .addCase(bookFromChat.pending, (state) => {
        state.loading = true;
      })
      .addCase(bookFromChat.fulfilled, (state, action) => {
        state.loading = false;
        state.bookedAppointment = action.payload.appointment;
      })
      .addCase(bookFromChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetChat, addUserMessage, setTyping, clearError } = chatSlice.actions;

// Selectors
export const selectChatSession = (state) => state.chat.sessionId;
export const selectMessages = (state) => state.chat.messages;
export const selectTriageResult = (state) => state.chat.triageResult;
export const selectTriageComplete = (state) => state.chat.triageComplete;
export const selectRecommendedDoctors = (state) => state.chat.recommendedDoctors;
export const selectIsTyping = (state) => state.chat.isTyping;
export const selectChatLoading = (state) => state.chat.loading;

export default chatSlice.reducer;
