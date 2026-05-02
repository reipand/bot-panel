import axios from 'axios';
import logger from '../utils/logger.js';

// Two separate clients: Application API (admin) and Client API (user-scoped)
const appClient = axios.create({
  baseURL: `${process.env.PTERODACTYL_URL}/api/application`,
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${process.env.PTERODACTYL_APP_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const clientApi = axios.create({
  baseURL: `${process.env.PTERODACTYL_URL}/api/client`,
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${process.env.PTERODACTYL_CLIENT_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

[appClient, clientApi].forEach((c) => {
  c.interceptors.response.use(
    (r) => r,
    (err) => {
      logger.error('Pterodactyl API error', {
        url:    err.config?.url,
        status: err.response?.status,
        data:   err.response?.data,
      });
      return Promise.reject(err);
    }
  );
});

// ─── Application API ─────────────────────────────────────────────────────────

export async function createPteroUser({ email, username, firstName, lastName, password }) {
  const { data } = await appClient.post('/users', {
    email,
    username,
    first_name: firstName,
    last_name:  lastName,
    password,
  });
  return data.attributes;
}

export async function getPteroUserByEmail(email) {
  const { data } = await appClient.get(`/users?filter[email]=${encodeURIComponent(email)}`);
  return data.data[0]?.attributes || null;
}

export async function createServer({
  name,
  userId,          // pterodactyl user id
  eggId,
  nestId,
  environment,
  memory,
  disk,
  cpu,
  allocationId,
}) {
  const { data } = await appClient.post('/servers', {
    name,
    user:        userId,
    egg:         eggId,
    docker_image: 'ghcr.io/pterodactyl/yolks:java_17',
    startup:     '{{STARTUP_CMD}}',
    environment,
    limits: {
      memory,
      swap:  0,
      disk,
      io:    500,
      cpu,
    },
    feature_limits: {
      databases:   1,
      backups:     2,
      allocations: 1,
    },
    allocation: {
      default: allocationId,
    },
    start_on_completion: true,
  });
  return data.attributes;
}

export async function deleteServer(serverId) {
  await appClient.delete(`/servers/${serverId}`);
}

export async function getAvailableAllocation(nodeId) {
  const { data } = await appClient.get(`/nodes/${nodeId}/allocations`);
  const free = data.data.find((a) => !a.attributes.assigned);
  return free?.attributes || null;
}

// ─── Client API ──────────────────────────────────────────────────────────────

export async function sendPowerSignal(identifier, signal) {
  // signal: 'start' | 'stop' | 'restart' | 'kill'
  await clientApi.post(`/servers/${identifier}/power`, { signal });
}

export async function getServerResources(identifier) {
  const { data } = await clientApi.get(`/servers/${identifier}/resources`);
  return data.attributes;
}

export async function getServerDetails(identifier) {
  const { data } = await clientApi.get(`/servers/${identifier}`);
  return data.attributes;
}

export async function listClientServers() {
  const { data } = await clientApi.get('/');
  return data.data.map((s) => s.attributes);
}
