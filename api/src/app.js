import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

import { requireApiKey } from './middleware/auth.js';
import { requestLogger } from './middleware/logger.js';
import serverRoutes from './routes/servers.js';
import userRoutes from './routes/users.js';
import deployRoutes from './routes/deploy.js';
import logger from './utils/logger.js';

const app = express();

// Security headers
app.use(helmet());

// Only accept requests from localhost unless explicitly configured otherwise
app.use(cors({ origin: process.env.CORS_ORIGIN || false }));

// Body parsing
app.use(express.json({ limit: '64kb' }));

// Request logging
app.use(requestLogger);

// Global rate limit (DDoS protection at the HTTP layer)
app.use(rateLimit({
  windowMs: 60 * 1000,
  max:      200,
  standardHeaders: true,
  legacyHeaders:   false,
  message:  { message: 'Too many requests.' },
}));

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// All API routes require internal API key
app.use('/api', requireApiKey);
app.use('/api/servers', serverRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/deploy',  deployRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ message: 'Not found.' }));

// Error handler
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { err: err.message, stack: err.stack });
  res.status(500).json({ message: 'Internal server error.' });
});

export default app;
