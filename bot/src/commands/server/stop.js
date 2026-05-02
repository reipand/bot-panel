import { SlashCommandBuilder } from 'discord.js';
import { apiPost } from '../../utils/apiClient.js';
import { checkRateLimit } from '../../utils/rateLimiter.js';
import { successEmbed, errorEmbed } from '../../utils/embed.js';
import logger from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop a server')
  .addStringOption((opt) =>
    opt.setName('server_id')
      .setDescription('Pterodactyl server identifier')
      .setRequired(true)
  );

export async function execute(interaction) {
  const rl = await checkRateLimit(interaction.user.id, 'stop');
  if (!rl.allowed) {
    return interaction.reply({
      embeds: [errorEmbed('Rate Limited', `Too many requests. Try again in **${rl.resetIn}s**.`)],
      ephemeral: true,
    });
  }

  await interaction.deferReply();
  const serverId = interaction.options.getString('server_id');

  try {
    await apiPost(`/api/servers/${serverId}/stop`, { discord_id: interaction.user.id });
    logger.info('Server stop requested', { userId: interaction.user.id, serverId });
    await interaction.editReply({
      embeds: [successEmbed('Server Stopping', `Server \`${serverId}\` is shutting down.`)],
    });
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to stop server.';
    await interaction.editReply({ embeds: [errorEmbed('Stop Failed', msg)] });
  }
}
