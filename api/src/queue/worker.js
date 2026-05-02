import 'dotenv/config';
import { Worker, Queue } from 'bullmq';
import { processDeploy } from './jobs/deployJob.js';
import { pollAllServers } from '../services/monitoringService.js';
import logger from '../utils/logger.js';

const connection = {
  host:     process.env.REDIS_HOST     || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

// ─── Deploy Worker ────────────────────────────────────────────────────────────
const deployWorker = new Worker(
  'deploy',
  async (job) => {
    logger.info('Processing deploy job', { jobId: job.data.jobId, type: job.data.type });
    return processDeploy(job);
  },
  {
    connection,
    concurrency: 3,
  }
);

deployWorker.on('completed', (job) => {
  logger.info('Deploy job completed', { jobId: job.data.jobId });
});

deployWorker.on('failed', (job, err) => {
  logger.error('Deploy job failed', { jobId: job?.data?.jobId, err: err.message });
});

// ─── Monitoring Scheduler ────────────────────────────────────────────────────
const POLL_INTERVAL = parseInt(process.env.MONITOR_POLL_INTERVAL_MS || '30000');

async function runMonitorCycle() {
  try {
    await pollAllServers();
  } catch (err) {
    logger.error('Monitor cycle error', { err: err.message });
  } finally {
    setTimeout(runMonitorCycle, POLL_INTERVAL);
  }
}

runMonitorCycle();

logger.info('Queue worker started', { pollInterval: POLL_INTERVAL });
