import Redis from 'ioredis';
import logger from './logger.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
});

redis.on('error', (err) => logger.error('Redis error', { err: err.message }));

// Limits per action per user (requests / window in seconds)
const LIMITS = {
  default:  { max: 5,  window: 60  },
  deploy:   { max: 1,  window: 300 },
  status:   { max: 10, window: 60  },
  start:    { max: 3,  window: 120 },
  stop:     { max: 3,  window: 120 },
  restart:  { max: 3,  window: 120 },
};

/**
 * Returns { allowed: boolean, remaining: number, resetIn: number }
 */
export async function checkRateLimit(userId, action) {
  const adminRoles = [process.env.ADMIN_ROLE_ID];
  if (adminRoles.includes(userId)) return { allowed: true, remaining: 999, resetIn: 0 };

  const limit = LIMITS[action] || LIMITS.default;
  const key = `rl:${userId}:${action}`;

  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, limit.window);

  const ttl = await redis.ttl(key);
  const remaining = Math.max(0, limit.max - current);
  const allowed = current <= limit.max;

  return { allowed, remaining, resetIn: ttl };
}

export default redis;
