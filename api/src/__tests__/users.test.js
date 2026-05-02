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
  sendPowerSignal:        vi.fn(),
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
import { getPteroUserByEmail } from '../services/pterodactylService.js';
import { getServerWithResources } from '../services/monitoringService.js';

const API_KEY = 'test-secret-key';

const mockUser = {
  discord_id: '123',
  pterodactyl_user_id: 1,
  pterodactyl_username: 'testuser',
  pterodactyl_email: 'test@example.com',
  server_limit: 3,
  role: 'user',
};

const mockUserWithCount = { ...mockUser, server_count: 1 };

beforeEach(() => {
  query.mockResolvedValue([]);
  queryOne.mockResolvedValue(null);
});

describe('GET /api/users/:discord_id', () => {
  it('creates and returns a new user when not found', async () => {
    // findOrCreateUser: queryOne → null (user doesn't exist), then query INSERT, then queryOne → mockUser
    // getUser: queryOne → mockUserWithCount
    queryOne
      .mockResolvedValueOnce(null)        // findOrCreateUser: SELECT (not found)
      .mockResolvedValueOnce(mockUser)    // findOrCreateUser: SELECT after INSERT
      .mockResolvedValueOnce(mockUserWithCount); // getUser: SELECT with server_count

    const res = await request(app)
      .get('/api/users/123')
      .set('X-API-Key', API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.discord_id).toBe('123');
  });

  it('returns existing user', async () => {
    // findOrCreateUser: queryOne → mockUser (user exists, no INSERT)
    // getUser: queryOne → mockUserWithCount
    queryOne
      .mockResolvedValueOnce(mockUser)        // findOrCreateUser: user already exists
      .mockResolvedValueOnce(mockUserWithCount); // getUser

    const res = await request(app)
      .get('/api/users/123')
      .set('X-API-Key', API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  it('returns 500 when DB throws', async () => {
    queryOne.mockRejectedValueOnce(new Error('DB connection failed'));

    const res = await request(app)
      .get('/api/users/123')
      .set('X-API-Key', API_KEY);

    expect(res.status).toBe(500);
  });
});

describe('POST /api/users/link', () => {
  it('returns 400 when discord_id is missing', async () => {
    const res = await request(app)
      .post('/api/users/link')
      .set('X-API-Key', API_KEY)
      .send({ email: 'test@example.com', api_key: 'mykey' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/users/link')
      .set('X-API-Key', API_KEY)
      .send({ discord_id: '123', api_key: 'mykey' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when api_key is missing', async () => {
    const res = await request(app)
      .post('/api/users/link')
      .set('X-API-Key', API_KEY)
      .send({ discord_id: '123', email: 'test@example.com' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when Pterodactyl account not found', async () => {
    // findOrCreateUser: queryOne → mockUser (user exists)
    queryOne.mockResolvedValueOnce(mockUser);
    getPteroUserByEmail.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/users/link')
      .set('X-API-Key', API_KEY)
      .send({ discord_id: '123', email: 'notfound@example.com', api_key: 'mykey' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Pterodactyl account not found for that email.');
  });

  it('returns 200 with user on successful link', async () => {
    const pteroUser = { id: 42, username: 'pterouser', email: 'test@example.com' };
    const linkedUser = { ...mockUser, pterodactyl_username: 'pterouser' };

    // findOrCreateUser: queryOne → mockUser (exists)
    // linkPteroAccount: getPteroUserByEmail → pteroUser, query UPDATE, queryOne → linkedUser
    queryOne
      .mockResolvedValueOnce(mockUser)    // findOrCreateUser
      .mockResolvedValueOnce(linkedUser); // linkPteroAccount: final SELECT

    getPteroUserByEmail.mockResolvedValueOnce(pteroUser);
    query.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/users/link')
      .set('X-API-Key', API_KEY)
      .send({ discord_id: '123', email: 'test@example.com', api_key: 'mykey' });

    expect(res.status).toBe(200);
    expect(res.body.user.pterodactyl_username).toBe('pterouser');
  });
});

describe('GET /api/users/:discord_id/servers', () => {
  it('returns empty servers array when user has no servers', async () => {
    query.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/users/123/servers')
      .set('X-API-Key', API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.servers).toEqual([]);
  });

  it('returns enriched servers when user has servers', async () => {
    const serverRow = { pterodactyl_identifier: 'abc123', name: 'My Server', status: 'running' };
    const enriched = { ...serverRow, cpu: '12.5', memory_bytes: 512000000 };

    query.mockResolvedValue([serverRow]);
    getServerWithResources.mockResolvedValue(enriched);

    const res = await request(app)
      .get('/api/users/123/servers')
      .set('X-API-Key', API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.servers).toHaveLength(1);
    expect(res.body.servers[0]).toMatchObject(enriched);
  });
});
