import { createLogger, format, transports } from 'winston';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      ),
    }),
    new transports.File({
      filename: join(__dirname, '../../logs/error.log'),
      level: 'error',
    }),
    new transports.File({
      filename: join(__dirname, '../../logs/combined.log'),
    }),
  ],
});

export default logger;
