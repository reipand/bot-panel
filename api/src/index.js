import 'dotenv/config';
import app from './app.js';
import logger from './utils/logger.js';

const PORT = parseInt(process.env.PORT || '3000');

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`API server listening on 0.0.0.0:${PORT}`);
});
