import logger from '../utils/logger.js';

export function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_SECRET_KEY) {
    logger.warn('Unauthorized API access attempt', { ip: req.ip, path: req.path });
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}
