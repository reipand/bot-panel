import { query, queryOne } from '../database/connection.js';
import { getPteroUserByEmail } from './pterodactylService.js';
import logger from '../utils/logger.js';

export async function findOrCreateUser(discordId) {
  let user = await queryOne('SELECT * FROM users WHERE discord_id = ?', [discordId]);
  if (!user) {
    await query('INSERT INTO users (discord_id) VALUES (?)', [discordId]);
    user = await queryOne('SELECT * FROM users WHERE discord_id = ?', [discordId]);
    logger.info('Created new user', { discordId });
  }
  return user;
}

export async function getUser(discordId) {
  const user = await queryOne(`
    SELECT u.*,
      (SELECT COUNT(*) FROM servers s WHERE s.owner_discord_id = u.discord_id) AS server_count
    FROM users u
    WHERE u.discord_id = ?
  `, [discordId]);
  return user;
}

export async function linkPteroAccount(discordId, email, apiKey) {
  // Verify credentials by fetching the user from Pterodactyl
  const pteroUser = await getPteroUserByEmail(email);
  if (!pteroUser) {
    throw Object.assign(new Error('Pterodactyl account not found for that email.'), { status: 404 });
  }

  await query(`
    UPDATE users
    SET pterodactyl_user_id   = ?,
        pterodactyl_username  = ?,
        pterodactyl_email     = ?
    WHERE discord_id = ?
  `, [pteroUser.id, pteroUser.username, email, discordId]);

  return queryOne('SELECT * FROM users WHERE discord_id = ?', [discordId]);
}

export async function getUserServers(discordId) {
  return query('SELECT * FROM servers WHERE owner_discord_id = ?', [discordId]);
}

export async function canUserCreateServer(discordId) {
  const user = await queryOne(`
    SELECT u.server_limit,
      (SELECT COUNT(*) FROM servers s WHERE s.owner_discord_id = u.discord_id) AS server_count
    FROM users u WHERE u.discord_id = ?
  `, [discordId]);

  if (!user) return { allowed: false, reason: 'User not registered. Use /link first.' };
  if (!user.pterodactyl_user_id) return { allowed: false, reason: 'Account not linked. Use /link first.' };
  if (user.server_count >= user.server_limit) {
    return { allowed: false, reason: `Server limit reached (${user.server_count}/${user.server_limit}).` };
  }
  return { allowed: true, user };
}
