import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../database/connection.js', () => ({
  query:    vi.fn(),
  queryOne: vi.fn(),
  default:  { on: vi.fn() },
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('../models/AuditLog.js', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/pterodactylService.js', () => ({
  getPteroUserByEmail:    vi.fn(),
  sendPowerSignal:        vi.fn().mockResolvedValue(undefined),
  getServerResources:     vi.fn(),
  createPteroUser:        vi.fn(),
  createServer:           vi.fn(),
  deleteServer:           vi.fn(),
  getAvailableAllocation: vi.fn(),
  getServerDetails:       vi.fn(),
  listClientServers:      vi.fn(),
}));

vi.mock('../services/monitoringService.js', () => ({
  getServerWithResources: vi.fn(),
  pollAllServers:         vi.fn(),
}));

import app from '../app.js';
import { query, queryOne } from '../database/connection.js';
import { sendPowerSignal } from '../services/pterodactylService.js';
import { getServerWithResources } from '../services/monitoringService.js';

const API_KEY = 'test-secret-key';
const IDENTIFIER = 'srv-abc123';
const OWNER_ID = 'owner-discord-id';
const OTHER_ID = 'other-discord-id';

const ownedServer = { pterodactyl_identifier: IDENTIFIER, owner_discord_id: OWNER_ID, name: 'Test Server', status: 'running' };
const otherServer = { pterodactyl_identifier: IDENTIFIER, owner_discord_id: OTHER_ID, name: 'Test Server', status: 'running' };
const adminUser   = { role: 'admin' };
const regularUser = { role: 'user' };

beforeEach(() => {
  query.mockResolvedValue([]);
  queryOne.mockResolvedValue(null);
});

describe('POST /api/servers/:id/start', () => {
  it('returns 404 when server not found', async () => {
    queryOne.mockResolvedValueOnce(null); // server not found

    const res = await request(app)
      .post(`/api/servers/${IDENTIFIER}/start`)
      .set('X-API-Key', API_KEY)
      .send({ discord_id: OWNER_ID });

    expect(res.status).toBe(404);
  });

  it('returns 403 when requester is not owner and not admin', async () => {
    queryOne
      .mockResolvedValueOnce(otherServer) // server belongs to OTHER_ID
      .mockResolvedValueOnce(regularUser); // requester has role 'user'

    const res = await request(app)
      .post(`/api/servers/${IDENTIFIER}/start`)
      .set('X-API-Key', API_KEY)
      .send({ discord_id: OWNER_ID });

    expect(res.status).toBe(403);
  });

  it('returns 200 when requester is the owner', async () => {
    queryOne.mockResolvedValueOnce(ownedServer); // server owned by OWNER_ID

    const res = await request(app)
      .post(`/api/servers/${IDENTIFIER}/start`)
      .set('X-API-Key', API_KEY)
      .send({ discord_id: OWNER_ID });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Server is starting.');
  });

  it('returns 200 when requester is admin (not owner)', async () => {
    queryOne
      .mockResolvedValueOnce(otherServer) // server belongs to OTHER_ID
      .mockResolvedValueOnce(adminUser);  // requester is admin

    const res = await request(app)
      .post(`/api/servers/${IDENTIFIER}/start`)
      .set('X-API-Key', API_KEY)
      .send({ discord_id: OWNER_ID });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Server is starting.');
  });
});

describe('POST /api/servers/:id/stop', () => {
  it('returns 404 when server not found', async () => {
    queryOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .post(`/api/servers/${IDENTIFIER}/stop`)
      .set('X-API-Key', API_KEY)
      .send({ discord_id: OWNER_ID });

    expect(res.status).toBe(404);
  });

  it('returns 200 when requester is the owner', async () => {
    queryOne.mockResolvedValueOnce(ownedServer);

    const res = await request(app)
      .post(`/api/servers/${IDENTIFIER}/stop`)
      .set('X-API-Key', API_KEY)
      .send({ discord_id: OWNER_ID });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Server is stopping.');
  });
});

describe('POST /api/servers/:id/restart', () => {
  it('returns 404 when server not found', async () => {
    queryOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .post(`/api/servers/${IDENTIFIER}/restart`)
      .set('X-API-Key', API_KEY)
      .send({ discord_id: OWNER_ID });

    expect(res.status).toBe(404);
  });

  it('returns 200 when requester is the owner', async () => {
    queryOne.mockResolvedValueOnce(ownedServer);

    const res = await request(app)
      .post(`/api/servers/${IDENTIFIER}/restart`)
      .set('X-API-Key', API_KEY)
      .send({ discord_id: OWNER_ID });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Server is restarting.');
  });
});

describe('GET /api/servers/:id/status', () => {
  it('returns 404 when server not found', async () => {
    queryOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/api/servers/${IDENTIFIER}/status?discord_id=${OWNER_ID}`)
      .set('X-API-Key', API_KEY);

    expect(res.status).toBe(404);
  });

  it('returns 403 when requester is not owner', async () => {
    queryOne
      .mockResolvedValueOnce(otherServer) // server belongs to OTHER_ID
      .mockResolvedValueOnce(regularUser); // requester is regular user

    const res = await request(app)
      .get(`/api/servers/${IDENTIFIER}/status?discord_id=${OWNER_ID}`)
      .set('X-API-Key', API_KEY);

    expect(res.status).toBe(403);
  });

  it('returns 200 with server details when requester is owner', async () => {
    const enrichedServer = { ...ownedServer, cpu: '5.0', memory_bytes: 256000000 };

    queryOne.mockResolvedValueOnce(ownedServer); // server owned by OWNER_ID
    getServerWithResources.mockResolvedValueOnce(enrichedServer);

    const res = await request(app)
      .get(`/api/servers/${IDENTIFIER}/status?discord_id=${OWNER_ID}`)
      .set('X-API-Key', API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.server).toMatchObject(enrichedServer);
  });
});
