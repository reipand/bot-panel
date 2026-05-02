import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));

const conn = await mysql.createConnection({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
});

const sql = readFileSync(join(__dirname, 'migrations/schema.sql'), 'utf8');

try {
  await conn.query(sql);
  console.log('Migration completed successfully.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await conn.end();
}
