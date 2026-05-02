import { query, queryOne } from '../database/connection.js';
import { sendPowerSignal } from '../services/pterodactylService.js';
import { getServerWithResources } from '../services/monitoringService.js';
import { audit } from '../models/AuditLog.js';
import logger from '../utils/logger.js';

async function getOwnedServer(identifier, discordId) {
  const server = await queryOne(
    'SELECT * FROM servers WHERE pterodactyl_identifier = ?',
    [identifier]
  );
  if (!server) {
    throw Object.assign(new Error('Server not found.'), { status: 404 });
  }
  if (server.owner_discord_id !== discordId) {
    // Allow admins — check role
    const user = await queryOne('SELECT role FROM users WHERE discord_id = ?', [discordId]);
    if (user?.role !== 'admin') {
      throw Object.assign(new Error('You do not own this server.'), { status: 403 });
    }
  }
  return server;
}

export async function startServer(req, res) {
  const { identifier } = req.params;
  const { discord_id }  = req.body;

  try {
    const server = await getOwnedServer(identifier, discord_id);
    await sendPowerSignal(identifier, 'start');
    await query("UPDATE servers SET status = 'starting' WHERE pterodactyl_identifier = ?", [identifier]);
    await audit({ discordId: discord_id, action: 'server.start', targetType: 'server', targetId: identifier, ip: req.ip });
    logger.info('Server start', { identifier, discordId: discord_id });
    res.json({ message: 'Server is starting.' });
  } catch (err) {
    await audit({ discordId: discord_id, action: 'server.start', targetType: 'server', targetId: identifier, ip: req.ip, success: false });
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function stopServer(req, res) {
  const { identifier } = req.params;
  const { discord_id }  = req.body;

  try {
    await getOwnedServer(identifier, discord_id);
    await sendPowerSignal(identifier, 'stop');
    await query("UPDATE servers SET status = 'stopping' WHERE pterodactyl_identifier = ?", [identifier]);
    await audit({ discordId: discord_id, action: 'server.stop', targetType: 'server', targetId: identifier, ip: req.ip });
    res.json({ message: 'Server is stopping.' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function restartServer(req, res) {
  const { identifier } = req.params;
  const { discord_id }  = req.body;

  try {
    await getOwnedServer(identifier, discord_id);
    await sendPowerSignal(identifier, 'restart');
    await audit({ discordId: discord_id, action: 'server.restart', targetType: 'server', targetId: identifier, ip: req.ip });
    res.json({ message: 'Server is restarting.' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getServerStatus(req, res) {
  const { identifier }   = req.params;
  const discord_id        = req.query.discord_id;

  try {
    await getOwnedServer(identifier, discord_id);
    const server = await getServerWithResources(identifier);
    res.json({ server });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
