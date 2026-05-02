import { getUser, findOrCreateUser, linkPteroAccount, getUserServers } from '../services/userService.js';
import { getServerWithResources } from '../services/monitoringService.js';
import { audit } from '../models/AuditLog.js';

export async function getUserInfo(req, res) {
  const { discord_id } = req.params;

  try {
    await findOrCreateUser(discord_id);
    const user = await getUser(discord_id);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function linkUser(req, res) {
  const { discord_id, email, api_key } = req.body;

  if (!discord_id || !email || !api_key) {
    return res.status(400).json({ message: 'discord_id, email, and api_key are required.' });
  }

  try {
    await findOrCreateUser(discord_id);
    const user = await linkPteroAccount(discord_id, email, api_key);
    await audit({ discordId: discord_id, action: 'user.link', targetType: 'user', targetId: discord_id, ip: req.ip });
    res.json({ user });
  } catch (err) {
    await audit({ discordId: discord_id, action: 'user.link', targetType: 'user', targetId: discord_id, ip: req.ip, success: false });
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getUserServerList(req, res) {
  const { discord_id } = req.params;

  try {
    const rawServers = await getUserServers(discord_id);
    const servers = await Promise.all(
      rawServers.map((s) => getServerWithResources(s.pterodactyl_identifier))
    );
    res.json({ servers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
