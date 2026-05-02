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

beforeEach(() => {
  query.mockResolvedValue([]);
  queryOne.mockResolvedValue(null);
});

describe('Auth middleware', () => {
  it('returns 401 when X-API-Key header is missing', async () => {
    const res = await request(app).get('/api/users/123');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('returns 401 when X-API-Key is wrong', async () => {
    const res = await request(app)
      .get('/api/users/123')
      .set('X-API-Key', 'wrong-key');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('returns 404 (not 401) for unknown route with correct key', async () => {
    const res = await request(app)
      .get('/api/nonexistent')
      .set('X-API-Key', 'test-secret-key');
    expect(res.status).toBe(404);
  });
});
