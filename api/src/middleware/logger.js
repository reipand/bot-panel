import logger from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP request', {
      method: req.method,
      path:   req.path,
      status: res.statusCode,
      ms:     Date.now() - start,
      ip:     req.ip,
    });
  });
  next();
}
