import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  sendOTP: (data) => api.post('/auth/send-otp', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data)
};

export const chatAPI = {
  startSession: (data) => api.post('/chat/start', data),
  sendMessage: (sessionId, message) => api.post(`/chat/${sessionId}/message`, { message }),
  getSession: (sessionId) => api.get(`/chat/${sessionId}`),
  getDoctors: (sessionId, params) => api.get(`/chat/${sessionId}/doctors`, { params }),
  bookFromChat: (sessionId, data) => api.post(`/chat/${sessionId}/book`, data)
};

export const appointmentAPI = {
  create: (data) => api.post('/appointments', data),
  getAll: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  checkIn: (id) => api.put(`/appointments/${id}/check-in`),
  cancel: (id, reason) => api.put(`/appointments/${id}/cancel`, { reason }),
  reschedule: (id, data) => api.post(`/appointments/${id}/reschedule`, data),
  submitFeedback: (id, data) => api.post(`/appointments/${id}/feedback`, data)
};

export const doctorAPI = {
  getById: (id) => api.get(`/doctors/${id}`),
  getSlots: (id, date) => api.get(`/doctors/${id}/slots`, { params: { date } }),
  getQueue: (id) => api.get(`/doctors/${id}/queue`),
  getAppointments: (id, params) => api.get(`/doctors/${id}/appointments`, { params }),
  startQueue: (id) => api.put(`/doctors/${id}/queue/start`),
  callNext: (id) => api.put(`/doctors/${id}/queue/next`),
  updateProfile: (id, data) => api.put(`/doctors/${id}`, data),
  blockDate: (id, data) => api.post(`/doctors/${id}/block-date`, data)
};

export const queueAPI = {
  getToday: (doctorId) => api.get(`/queue/${doctorId}/today`),
  getPatientStatus: (doctorId) => api.get(`/queue/${doctorId}/patient-status`),
  callNext: (doctorId) => api.put(`/queue/${doctorId}/call-next`),
  completeCurrent: (doctorId, notes) => api.put(`/queue/${doctorId}/complete-current`, { notes }),
  skipPatient: (doctorId, data) => api.put(`/queue/${doctorId}/skip-patient`, data),
  addDelay: (doctorId, data) => api.put(`/queue/${doctorId}/add-delay`, data),
  pause: (doctorId) => api.put(`/queue/${doctorId}/pause`),
  resume: (doctorId) => api.put(`/queue/${doctorId}/resume`),
  close: (doctorId) => api.put(`/queue/${doctorId}/close`)
};

export const hospitalAPI = {
  getAll: (params) => api.get('/hospitals', { params }),
  getById: (id) => api.get(`/hospitals/${id}`),
  getDoctors: (id, params) => api.get(`/hospitals/${id}/doctors`, { params }),
  getStats: (id) => api.get(`/hospitals/${id}/stats`),
  update: (id, data) => api.put(`/hospitals/${id}`, data),
  onboard: (data) => api.post('/hospitals/onboard', data)
};

export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`)
};

export default api;
