// Set all required env vars before any module loads
process.env.API_SECRET_KEY = 'test-secret-key';

// Pterodactyl
process.env.PTERODACTYL_URL = 'http://pterodactyl.test';
process.env.PTERODACTYL_APP_API_KEY = 'test-app-api-key';
process.env.PTERODACTYL_CLIENT_API_KEY = 'test-client-api-key';

// Database
process.env.DB_HOST = '127.0.0.1';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';

// Redis
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'test_redis_password';
