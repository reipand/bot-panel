import { describe, it, expect, vi } from 'vitest';
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

describe('GET /health', () => {
  it('returns 200 with status ok and numeric uptime', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});
