import mysql from 'mysql2/promise';
import logger from '../utils/logger.js';

const pool = mysql.createPool({
  host:              process.env.DB_HOST     || '127.0.0.1',
  port:    parseInt(process.env.DB_PORT      || '3306'),
  database:          process.env.DB_NAME     || 'pterodactyl_bot',
  user:              process.env.DB_USER     || 'botuser',
  password:          process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  timezone:           'Z',
  decimalNumbers:     true,
});

pool.on('connection', () => logger.debug('MySQL: new connection acquired'));

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function transaction(fn) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export default pool;
