import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../database/connection.js';
import { canUserCreateServer, findOrCreateUser } from '../services/userService.js';
import { audit } from '../models/AuditLog.js';
import logger from '../utils/logger.js';

const SUPPORTED_TYPES = ['minecraft', 'rust', 'terraria'];
const ESTIMATED_SECONDS = { minecraft: 45, rust: 90, terraria: 30 };

const deployQueue = new Queue('deploy', {
  connection: {
    host:     process.env.REDIS_HOST     || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

export async function queueDeploy(req, res) {
  const { discord_id, type, name, version = 'latest' } = req.body;

  if (!discord_id || !type || !name) {
    return res.status(400).json({ message: 'discord_id, type, and name are required.' });
  }

  if (!SUPPORTED_TYPES.includes(type)) {
    return res.status(400).json({ message: `Unsupported type. Supported: ${SUPPORTED_TYPES.join(', ')}` });
  }

  const nameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!nameRegex.test(name) || name.length > 32) {
    return res.status(400).json({ message: 'Invalid server name. Use letters, numbers, _ and - only.' });
  }

  try {
    await findOrCreateUser(discord_id);
    const { allowed, reason } = await canUserCreateServer(discord_id);
    if (!allowed) {
      return res.status(403).json({ message: reason });
    }

    const jobId = uuidv4();

    await query(
      'INSERT INTO deploy_queue (job_id, discord_id, server_type, server_name, version) VALUES (?, ?, ?, ?, ?)',
      [jobId, discord_id, type, name, version]
    );

    await deployQueue.add('deploy', { jobId, discordId: discord_id, type, name, version }, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    await audit({ discordId: discord_id, action: 'deploy.queued', targetType: 'server', targetId: jobId, ip: req.ip });
    logger.info('Deploy queued', { jobId, discordId: discord_id, type, name });

    res.status(202).json({ job_id: jobId, estimated_seconds: ESTIMATED_SECONDS[type] || 60 });
  } catch (err) {
    logger.error('Failed to queue deploy', { err: err.message });
    res.status(500).json({ message: 'Failed to queue deployment.' });
  }
}

export async function getDeployStatus(req, res) {
  const { job_id } = req.params;

  try {
    const job = await queryOne('SELECT * FROM deploy_queue WHERE job_id = ?', [job_id]);
    if (!job) return res.status(404).json({ message: 'Job not found.' });

    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
