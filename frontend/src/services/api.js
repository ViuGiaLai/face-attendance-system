import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Enhanced error handling interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    const errorInfo = {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    };
    
    console.error('API Error:', errorInfo);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Return a consistent error format
    return Promise.reject({
      message: error.response?.data?.error || error.message || 'Có lỗi xảy ra',
      details: error.response?.data?.details,
      status: error.response?.status,
      code: error.code
    });
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

export const faceAPI = {
  register: (data) => api.post('/face/register', data),
  batchRegister: (data) => api.post('/face/register/batch', data),
  recognize: (data) => api.post('/face/recognize', data),
  getRegistrationStatus: (userId) => api.get(`/face/register/status/${userId}`),
};

export const attendanceAPI = {
  log: (data) => api.post('/attendance/log', data),
  history: (params) => api.get('/attendance/history', { params }),
  today: () => api.get('/attendance/today'),
  stats: (params) => api.get('/attendance/stats', { params }),
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
};

export default api;