import { SlashCommandBuilder } from 'discord.js';
import { apiPost } from '../../utils/apiClient.js';
import { checkRateLimit } from '../../utils/rateLimiter.js';
import { successEmbed, errorEmbed, loadingEmbed } from '../../utils/embed.js';
import logger from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Start a server')
  .addStringOption((opt) =>
    opt.setName('server_id')
      .setDescription('Pterodactyl server identifier (e.g. a1b2c3d4)')
      .setRequired(true)
  );

export async function execute(interaction) {
  const rl = await checkRateLimit(interaction.user.id, 'start');
  if (!rl.allowed) {
    return interaction.reply({
      embeds: [errorEmbed('Rate Limited', `Too many requests. Try again in **${rl.resetIn}s**.`)],
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  const serverId = interaction.options.getString('server_id');

  try {
    await apiPost(`/api/servers/${serverId}/start`, { discord_id: interaction.user.id });

    logger.info('Server start requested', { userId: interaction.user.id, serverId });

    await interaction.editReply({
      embeds: [successEmbed('Server Starting', `Server \`${serverId}\` is starting up.`)],
    });
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to start server.';
    await interaction.editReply({ embeds: [errorEmbed('Start Failed', msg)] });
  }
}
