import axios from 'axios';
import logger from './logger.js';

const client = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.API_SECRET_KEY,
  },
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.message || err.message;
    logger.error('API request failed', { status, message, url: err.config?.url });
    return Promise.reject(err);
  }
);

export async function apiGet(path) {
  const { data } = await client.get(path);
  return data;
}

export async function apiPost(path, body) {
  const { data } = await client.post(path, body);
  return data;
}

export async function apiPatch(path, body) {
  const { data } = await client.patch(path, body);
  return data;
}

export async function apiDelete(path) {
  const { data } = await client.delete(path);
  return data;
}

export default client;
