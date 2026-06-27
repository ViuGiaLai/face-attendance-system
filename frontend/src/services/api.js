import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// In-memory cache for attendance data
const attendanceCache = { key: null, data: null, timestamp: 0 };
const CACHE_TTL = 30000; // 30 seconds

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const errorInfo = {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    };
    
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
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
  recognizeMulti: (data) => api.post('/face/recognize-multi', data),
  getRegistrationStatus: (userId) => api.get(`/face/register/status/${userId}`),
};

function cacheKey(params) {
  return JSON.stringify(params || {});
}

export const attendanceAPI = {
  log: (data) => api.post('/attendance/log', data),
  history: (params) => {
    const key = cacheKey(params);
    const now = Date.now();
    if (attendanceCache.key === key && (now - attendanceCache.timestamp) < CACHE_TTL) {
      return Promise.resolve({ data: { attendance: attendanceCache.data } });
    }
    return api.get('/attendance/history', { params }).then((res) => {
      attendanceCache.key = key;
      attendanceCache.data = res.data.attendance;
      attendanceCache.timestamp = now;
      return res;
    });
  },
  today: (params) => api.get('/attendance/today', { params }),
  stats: (params) => api.get('/attendance/stats', { params }),
  exportCsv: (params) => api.get('/attendance/export/csv', { params, responseType: 'blob' }),
  schedule: () => api.get('/attendance/schedule'),
  weekly: (params) => api.get('/attendance/weekly-stats', { params }),
  classStats: (params) => api.get('/attendance/class-stats', { params }),
  clearCache: () => {
    attendanceCache.key = null;
    attendanceCache.data = null;
    attendanceCache.timestamp = 0;
  },
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
};

export const classesAPI = {
  getAll: (params) => api.get('/classes/all', { params }),
  get: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  getStudents: (id) => api.get(`/classes/${id}/students`),
  addStudent: (classId, userId) => api.post(`/classes/${classId}/students`, { user_id: userId }),
  removeStudent: (classId, userId) => api.delete(`/classes/${classId}/students/${userId}`),
};

export const subjectsAPI = {
  getAll: (params) => api.get('/subjects/all', { params }),
  get: (id) => api.get(`/subjects/${id}`),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
};

export const schedulesAPI = {
  getAll: (params) => api.get('/schedules', { params }),
  create: (data) => api.post('/schedules', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`),
};

export default api;