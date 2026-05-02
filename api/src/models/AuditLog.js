import { query } from '../database/connection.js';

export async function audit({ discordId, action, targetType, targetId, details, ip, success = true }) {
  await query(
    `INSERT INTO audit_logs (discord_id, action, target_type, target_id, details, ip_address, success)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [discordId || null, action, targetType, targetId || null, details ? JSON.stringify(details) : null, ip || null, success]
  );
}
