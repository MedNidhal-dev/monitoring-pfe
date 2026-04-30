import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.75.129:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const incidentsService = {
  getAll: () => api.get('/incidents'),
  getById: (id) => api.get(`/incidents/${id}`),
  resolve: (id) => api.patch(`/incidents/${id}/resolve`),
  getStats: () => api.get('/incidents/stats'),
};

export const metricsService = {
  getLatest: (limit = 50) => api.get('/metrics', { params: { limit } }),
  getByModule: (moduleType, limit = 100) =>
    api.get(`/metrics/module/${moduleType}`, { params: { limit } }),
  getJenkins: () => api.get('/metrics/jenkins'),
  getNexus: () => api.get('/metrics/nexus'),
};

export const logsService = {
  getAll: (limit = 50) => api.get('/logs', { params: { limit } }),
  getByServer: (serverName, limit = 100) =>
    api.get(`/logs/server/${serverName}`, { params: { limit } }),
  exportLogs: () => api.get('/logs/export'),
};

export const knowledgeService = {
  getAll: () => api.get('/knowledge'),
  getSolutions: (anomalyType) => api.get(`/knowledge/resolve/${anomalyType}`),
  add: (payload) => api.post('/knowledge', payload),
  update: (id, payload) => api.put(`/knowledge/${id}`, payload),
  remove: (id) => api.delete(`/knowledge/${id}`),
};

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  me: () => api.get('/auth/me'),
};

export default api;
