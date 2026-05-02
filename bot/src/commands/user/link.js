import { SlashCommandBuilder } from 'discord.js';
import { apiPost } from '../../utils/apiClient.js';
import { checkRateLimit } from '../../utils/rateLimiter.js';
import { successEmbed, errorEmbed } from '../../utils/embed.js';
import logger from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Link your Discord account to Pterodactyl')
  .addStringOption((opt) =>
    opt.setName('email')
      .setDescription('Your Pterodactyl account email')
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('api_key')
      .setDescription('Your Pterodactyl client API key')
      .setRequired(true)
  );

export async function execute(interaction) {
  // Always ephemeral — contains sensitive data
  await interaction.deferReply({ ephemeral: true });

  const email = interaction.options.getString('email');
  const apiKey = interaction.options.getString('api_key');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return interaction.editReply({ embeds: [errorEmbed('Invalid Email', 'Please provide a valid email address.')] });
  }

  try {
    const { user } = await apiPost('/api/users/link', {
      discord_id: interaction.user.id,
      email,
      api_key: apiKey,
    });

    logger.info('User linked Pterodactyl account', { userId: interaction.user.id, pterodactylUserId: user.pterodactyl_user_id });

    await interaction.editReply({
      embeds: [successEmbed('Account Linked', `Your Discord is now linked to Pterodactyl user **${user.pterodactyl_username}**.`, [
        { name: 'Server Limit', value: `${user.server_limit}`,  inline: true },
        { name: 'Role',         value: user.role.toUpperCase(), inline: true },
      ])],
    });
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to link account. Check your credentials.';
    await interaction.editReply({ embeds: [errorEmbed('Link Failed', msg)] });
  }
}
