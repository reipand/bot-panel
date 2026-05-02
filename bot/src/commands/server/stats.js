import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { apiGet } from '../../utils/apiClient.js';
import { checkRateLimit } from '../../utils/rateLimiter.js';
import { errorEmbed } from '../../utils/embed.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Show all your servers and their stats');

export async function execute(interaction) {
  const rl = await checkRateLimit(interaction.user.id, 'status');
  if (!rl.allowed) {
    return interaction.reply({
      embeds: [errorEmbed('Rate Limited', `Too many requests. Try again in **${rl.resetIn}s**.`)],
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  try {
    const { servers } = await apiGet(`/api/users/${interaction.user.id}/servers`);

    if (!servers.length) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x99AAB5)
          .setTitle('📊 Your Servers')
          .setDescription('You have no servers yet. Use `/deploy` to create one.')
          .setTimestamp()],
      });
    }

    const statusEmoji = { running: '🟢', starting: '🟡', stopping: '🟠', offline: '🔴', error: '💥' };
    const fields = servers.map((s) => ({
      name: `${statusEmoji[s.status] || '❓'} ${s.name}`,
      value: [
        `**ID:** \`${s.identifier}\``,
        `**Status:** ${s.status.toUpperCase()}`,
        `**CPU:** ${s.cpu ?? '—'}%  **RAM:** ${formatMB(s.memory_bytes)}  **Disk:** ${formatMB(s.disk_bytes)}`,
      ].join('\n'),
      inline: false,
    }));

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊 ${interaction.user.username}'s Servers (${servers.length})`)
      .addFields(fields)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to fetch servers.';
    await interaction.editReply({ embeds: [errorEmbed('Stats Failed', msg)] });
  }
}

function formatMB(bytes) {
  if (bytes == null) return '—';
  return `${(bytes / 1048576).toFixed(0)} MB`;
}
