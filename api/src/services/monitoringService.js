import { query, queryOne } from '../database/connection.js';
import { getServerResources, sendPowerSignal } from './pterodactylService.js';
import logger from '../utils/logger.js';
import axios from 'axios';

const DISCORD_API = 'https://discord.com/api/v10';

async function sendDiscordAlert(channelId, embed) {
  if (!process.env.DISCORD_BOT_TOKEN || !channelId) return;
  try {
    await axios.post(
      `${DISCORD_API}/channels/${channelId}/messages`,
      { embeds: [embed] },
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
    );
  } catch (err) {
    logger.error('Failed to send Discord alert', { err: err.message });
  }
}

export async function pollAllServers() {
  const servers = await query(`
    SELECT s.*, u.discord_id
    FROM servers s
    JOIN users u ON u.discord_id = s.owner_discord_id
    WHERE s.status != 'offline' OR s.last_seen_online > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
  `);

  for (const server of servers) {
    try {
      const resources = await getServerResources(server.pterodactyl_identifier);
      const currentStatus = resources.current_state;

      await query(`
        UPDATE servers
        SET status = ?,
            last_seen_online = IF(? = 'running', NOW(), last_seen_online),
            alert_sent = IF(? = 'running', FALSE, alert_sent),
            updated_at = NOW()
        WHERE pterodactyl_identifier = ?
      `, [currentStatus, currentStatus, currentStatus, server.pterodactyl_identifier]);

      // Fire alert if server went offline unexpectedly
      if (currentStatus === 'offline' && server.status === 'running' && !server.alert_sent) {
        logger.warn('Server went offline unexpectedly', {
          serverId: server.pterodactyl_identifier,
          name: server.name,
        });

        await query(
          'UPDATE servers SET alert_sent = TRUE WHERE pterodactyl_identifier = ?',
          [server.pterodactyl_identifier]
        );

        await sendDiscordAlert(process.env.ALERT_DISCORD_CHANNEL_ID, {
          color: 0xED4245,
          title: '🔴 Server Offline Alert',
          description: `Server **${server.name}** (\`${server.pterodactyl_identifier}\`) went offline unexpectedly.`,
          fields: [
            { name: 'Owner', value: `<@${server.owner_discord_id}>`, inline: true },
            { name: 'Type',  value: server.type.toUpperCase(),        inline: true },
          ],
          timestamp: new Date().toISOString(),
        });
      }

      logger.debug('Server status updated', {
        id: server.pterodactyl_identifier,
        status: currentStatus,
        cpu: resources.resources?.cpu_absolute,
        memory: resources.resources?.memory_bytes,
      });
    } catch (err) {
      logger.error('Failed to poll server', {
        identifier: server.pterodactyl_identifier,
        err: err.message,
      });
    }
  }
}

export async function getServerWithResources(identifier) {
  const server = await queryOne(
    'SELECT * FROM servers WHERE pterodactyl_identifier = ?',
    [identifier]
  );
  if (!server) return null;

  try {
    const resources = await getServerResources(identifier);
    return {
      ...server,
      status:       resources.current_state,
      cpu:          resources.resources?.cpu_absolute?.toFixed(1),
      memory_bytes: resources.resources?.memory_bytes,
      disk_bytes:   resources.resources?.disk_bytes,
    };
  } catch {
    return { ...server };
  }
}
