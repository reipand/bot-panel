import { SlashCommandBuilder } from 'discord.js';
import { apiGet } from '../../utils/apiClient.js';
import { checkRateLimit } from '../../utils/rateLimiter.js';
import { serverStatusEmbed, errorEmbed } from '../../utils/embed.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Get server status and resource usage')
  .addStringOption((opt) =>
    opt.setName('server_id')
      .setDescription('Pterodactyl server identifier')
      .setRequired(true)
  );

export async function execute(interaction) {
  const rl = await checkRateLimit(interaction.user.id, 'status');
  if (!rl.allowed) {
    return interaction.reply({
      embeds: [errorEmbed('Rate Limited', `Too many requests. Try again in **${rl.resetIn}s**.`)],
      ephemeral: true,
    });
  }

  await interaction.deferReply();
  const serverId = interaction.options.getString('server_id');

  try {
    const { server } = await apiGet(`/api/servers/${serverId}/status?discord_id=${interaction.user.id}`);
    await interaction.editReply({ embeds: [serverStatusEmbed(server)] });
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to fetch server status.';
    await interaction.editReply({ embeds: [errorEmbed('Status Failed', msg)] });
  }
}
