import { SlashCommandBuilder } from 'discord.js';
import { apiPost } from '../../utils/apiClient.js';
import { checkRateLimit } from '../../utils/rateLimiter.js';
import { successEmbed, errorEmbed } from '../../utils/embed.js';
import logger from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('restart')
  .setDescription('Restart a server')
  .addStringOption((opt) =>
    opt.setName('server_id')
      .setDescription('Pterodactyl server identifier')
      .setRequired(true)
  );

export async function execute(interaction) {
  const rl = await checkRateLimit(interaction.user.id, 'restart');
  if (!rl.allowed) {
    return interaction.reply({
      embeds: [errorEmbed('Rate Limited', `Too many requests. Try again in **${rl.resetIn}s**.`)],
      ephemeral: true,
    });
  }

  await interaction.deferReply();
  const serverId = interaction.options.getString('server_id');

  try {
    await apiPost(`/api/servers/${serverId}/restart`, { discord_id: interaction.user.id });
    logger.info('Server restart requested', { userId: interaction.user.id, serverId });
    await interaction.editReply({
      embeds: [successEmbed('Server Restarting', `Server \`${serverId}\` is restarting.`)],
    });
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to restart server.';
    await interaction.editReply({ embeds: [errorEmbed('Restart Failed', msg)] });
  }
}
