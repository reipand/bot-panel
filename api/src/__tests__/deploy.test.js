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

const API_KEY = 'test-secret-key';

// A user who is fully linked and has room for more servers
const linkedUser = {
  discord_id: 'user-123',
  pterodactyl_user_id: 42,
  pterodactyl_username: 'testuser',
  server_limit: 3,
  server_count: 1,
  role: 'user',
};

beforeEach(() => {
  query.mockResolvedValue([]);
  queryOne.mockResolvedValue(null);
});

describe('POST /api/deploy', () => {
  it('returns 400 when discord_id is missing', async () => {
    const res = await request(app)
      .post('/api/deploy')
      .set('X-API-Key', API_KEY)
      .send({ type: 'minecraft', name: 'myserver' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when type is missing', async () => {
    const res = await request(app)
      .post('/api/deploy')
      .set('X-API-Key', API_KEY)
      .send({ discord_id: 'user-123', name: 'myserver' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/deploy')
      .set('X-API-Key', API_KEY)
      .send({ discord_id: 'user-123', type: 'minecraft' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for unsupported server type', async () => {
    const res = await request(app)
      .post('/api/deploy')
      .set('X-API-Key', API_KEY)
      .send({ discord_id: 'user-123', type: 'csgo', name: 'myserver' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for name with spaces', async () => {
    const res = await request(app)
      .post('/api/deploy')
      .set('X-API-Key', API_KEY)
      .send({ discord_id: 'user-123', type: 'minecraft', name: 'my server' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for name longer than 32 characters', async () => {
    const res = await request(app)
      .post('/api/deploy')
      .set('X-API-Key', API_KEY)
      .send({ discord_id: 'user-123', type: 'minecraft', name: 'a'.repeat(33) });

    expect(res.status).toBe(400);
  });

  it('returns 403 when user is not linked (canUserCreateServer not allowed)', async () => {
    // findOrCreateUser: queryOne → linkedUser (exists, no INSERT)
    // canUserCreateServer: queryOne → user with no pterodactyl_user_id
    const unlinkedUser = { discord_id: 'user-123', pterodactyl_user_id: null, server_limit: 3, server_count: 0 };

    queryOne
      .mockResolvedValueOnce(linkedUser)   // findOrCreateUser
      .mockResolvedValueOnce(unlinkedUser); // canUserCreateServer

    const res = await request(app)
      .post('/api/deploy')
      .set('X-API-Key', API_KEY)
      .send({ discord_id: 'user-123', type: 'minecraft', name: 'myserver' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('/link');
  });

  it('returns 403 when server limit is reached', async () => {
    const atLimitUser = { discord_id: 'user-123', pterodactyl_user_id: 42, server_limit: 2, server_count: 2 };

    queryOne
      .mockResolvedValueOnce(linkedUser)  // findOrCreateUser
      .mockResolvedValueOnce(atLimitUser); // canUserCreateServer

    const res = await request(app)
      .post('/api/deploy')
      .set('X-API-Key', API_KEY)
      .send({ discord_id: 'user-123', type: 'minecraft', name: 'myserver' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('limit');
  });

  it('returns 202 with job_id and estimated_seconds on success', async () => {
    queryOne
      .mockResolvedValueOnce(linkedUser)  // findOrCreateUser
      .mockResolvedValueOnce(linkedUser); // canUserCreateServer: allowed

    query.mockResolvedValue([]); // INSERT into deploy_queue

    const res = await request(app)
      .post('/api/deploy')
      .set('X-API-Key', API_KEY)
      .send({ discord_id: 'user-123', type: 'minecraft', name: 'myserver' });

    expect(res.status).toBe(202);
    expect(res.body.job_id).toBeDefined();
    expect(res.body.estimated_seconds).toBe(45);
  });
});

describe('GET /api/deploy/status/:job_id', () => {
  it('returns 404 when job not found', async () => {
    queryOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/deploy/status/nonexistent-job-id')
      .set('X-API-Key', API_KEY);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Job not found.');
  });

  it('returns 200 with job details when job exists', async () => {
    const jobRow = {
      job_id: 'test-job-id',
      discord_id: 'user-123',
      server_type: 'minecraft',
      server_name: 'myserver',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    queryOne.mockResolvedValueOnce(jobRow);

    const res = await request(app)
      .get('/api/deploy/status/test-job-id')
      .set('X-API-Key', API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.job).toMatchObject({ job_id: 'test-job-id', status: 'pending' });
  });
});
