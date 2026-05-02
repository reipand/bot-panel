import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

async function loadCommands() {
  const commandDirs = ['server', 'deploy', 'user'];
  for (const dir of commandDirs) {
    const dirPath = join(__dirname, 'commands', dir);
    const files = readdirSync(dirPath).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const mod = await import(pathToFileURL(join(dirPath, file)).href);
      if (mod.data && mod.execute) {
        client.commands.set(mod.data.name, mod);
        logger.info(`Loaded command: ${mod.data.name}`);
      }
    }
  }
}

async function loadEvents() {
  const eventsPath = join(__dirname, 'events');
  const files = readdirSync(eventsPath).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const mod = await import(pathToFileURL(join(eventsPath, file)).href);
    if (mod.once) {
      client.once(mod.name, (...args) => mod.execute(...args, client));
    } else {
      client.on(mod.name, (...args) => mod.execute(...args, client));
    }
    logger.info(`Loaded event: ${mod.name}`);
  }
}

async function main() {
  await loadCommands();
  await loadEvents();
  await client.login(process.env.DISCORD_TOKEN);
}

main().catch((err) => {
  logger.error('Fatal startup error', { err: err.message });
  process.exit(1);
});
