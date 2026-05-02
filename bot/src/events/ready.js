import { ActivityType } from 'discord.js';
import logger from '../utils/logger.js';

export const name = 'ready';
export const once = true;

export function execute(client) {
  logger.info(`Bot ready: logged in as ${client.user.tag}`);

  const activities = [
    { name: 'discord.gg/RutpuGPsrn', type: ActivityType.Streaming, url: 'https://www.twitch.tv/placeholder' },
    { name: 'admin pterodactyl', type: ActivityType.Custom, state: 'admin pterodactyl' },
  ];

  let index = 0;
  const rotate = () => {
    client.user.setPresence({ activities: [activities[index]], status: 'online' });
    index = (index + 1) % activities.length;
  };

  rotate();
  setInterval(rotate, 15000);
}
