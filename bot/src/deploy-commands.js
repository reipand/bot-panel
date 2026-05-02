import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = [];
const commandDirs = ['server', 'deploy', 'user'];

for (const dir of commandDirs) {
  const dirPath = join(__dirname, 'commands', dir);
  const files = readdirSync(dirPath).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const mod = await import(pathToFileURL(join(dirPath, file)).href);
    if (mod.data) commands.push(mod.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log(`Registering ${commands.length} application commands...`);

  const route = process.env.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID)
    : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

  await rest.put(route, { body: commands });
  console.log('Commands registered successfully.');
} catch (err) {
  console.error('Failed to register commands:', err);
  process.exit(1);
}
