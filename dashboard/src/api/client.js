import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const servers = {
  status:  (id)     => api.get(`/servers/${id}/status`).then(r => r.data),
  start:   (id, d)  => api.post(`/servers/${id}/start`, d).then(r => r.data),
  stop:    (id, d)  => api.post(`/servers/${id}/stop`, d).then(r => r.data),
  restart: (id, d)  => api.post(`/servers/${id}/restart`, d).then(r => r.data),
};

export const users = {
  get:      (id)   => api.get(`/users/${id}`).then(r => r.data),
  link:     (body) => api.post('/users/link', body).then(r => r.data),
  servers:  (id)   => api.get(`/users/${id}/servers`).then(r => r.data),
};

export const deploy = {
  create:    (body) => api.post('/deploy', body).then(r => r.data),
  status:    (id)   => api.get(`/deploy/status/${id}`).then(r => r.data),
};

export default api;
