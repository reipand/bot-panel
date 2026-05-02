import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { apiGet } from '../../utils/apiClient.js';
import { errorEmbed } from '../../utils/embed.js';

export const data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('View your account info and server quota');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const { user } = await apiGet(`/api/users/${interaction.user.id}`);

    const roleColors = { admin: 0xED4245, vip: 0xFEE75C, user: 0x5865F2 };

    const embed = new EmbedBuilder()
      .setColor(roleColors[user.role] || 0x5865F2)
      .setTitle('👤 Account Info')
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: 'Discord',          value: `<@${interaction.user.id}>`,              inline: true },
        { name: 'Pterodactyl User', value: user.pterodactyl_username || 'Not linked', inline: true },
        { name: 'Role',             value: user.role.toUpperCase(),                   inline: true },
        { name: 'Servers',          value: `${user.server_count}/${user.server_limit}`, inline: true },
        { name: 'Member Since',     value: `<t:${Math.floor(new Date(user.created_at).getTime() / 1000)}:R>`, inline: true },
      )
      .setTimestamp();

    if (!user.pterodactyl_username) {
      embed.setFooter({ text: 'Use /link to connect your Pterodactyl account.' });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to fetch user info.';
    await interaction.editReply({ embeds: [errorEmbed('Info Failed', msg)] });
  }
}
