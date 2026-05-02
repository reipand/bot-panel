import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { apiPost } from '../../utils/apiClient.js';
import { checkRateLimit } from '../../utils/rateLimiter.js';
import { loadingEmbed, errorEmbed, successEmbed } from '../../utils/embed.js';
import logger from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('deploy')
  .setDescription('Deploy a new game server')
  .addSubcommand((sub) =>
    sub.setName('minecraft')
      .setDescription('Deploy a new Minecraft server')
      .addStringOption((opt) =>
        opt.setName('name')
          .setDescription('Server name (alphanumeric, max 32 chars)')
          .setRequired(true)
          .setMaxLength(32)
      )
      .addStringOption((opt) =>
        opt.setName('version')
          .setDescription('Minecraft version')
          .addChoices(
            { name: 'Latest (Paper)', value: 'latest' },
            { name: '1.20.4',         value: '1.20.4'  },
            { name: '1.19.4',         value: '1.19.4'  },
            { name: '1.18.2',         value: '1.18.2'  },
          )
      )
  )
  .addSubcommand((sub) =>
    sub.setName('rust')
      .setDescription('Deploy a new Rust server')
      .addStringOption((opt) =>
        opt.setName('name').setDescription('Server name').setRequired(true).setMaxLength(32)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('terraria')
      .setDescription('Deploy a new Terraria server')
      .addStringOption((opt) =>
        opt.setName('name').setDescription('Server name').setRequired(true).setMaxLength(32)
      )
  );

export async function execute(interaction) {
  const rl = await checkRateLimit(interaction.user.id, 'deploy');
  if (!rl.allowed) {
    return interaction.reply({
      embeds: [errorEmbed('Rate Limited', `Deploy is limited to 1 per 5 minutes. Try again in **${rl.resetIn}s**.`)],
      ephemeral: true,
    });
  }

  const subcommand = interaction.options.getSubcommand();
  const name = interaction.options.getString('name');
  const version = interaction.options.getString('version') || 'latest';

  const nameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!nameRegex.test(name)) {
    return interaction.reply({
      embeds: [errorEmbed('Invalid Name', 'Server name can only contain letters, numbers, `_`, and `-`.')],
      ephemeral: true,
    });
  }

  await interaction.deferReply();
  await interaction.editReply({ embeds: [loadingEmbed('Deploying Server', `Creating your **${subcommand}** server \`${name}\`...\nThis may take up to 60 seconds.`)] });

  try {
    const { job_id, estimated_seconds } = await apiPost('/api/deploy', {
      discord_id: interaction.user.id,
      type: subcommand,
      name,
      version,
    });

    logger.info('Deploy job queued', { userId: interaction.user.id, type: subcommand, name, job_id });

    const checkBtn = new ButtonBuilder()
      .setCustomId(`deploy_check:${job_id}`)
      .setLabel('Check Status')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔄');

    const row = new ActionRowBuilder().addComponents(checkBtn);

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('⏳ Deploy Queued')
        .setDescription(`Your **${subcommand}** server \`${name}\` is being provisioned.`)
        .addFields(
          { name: 'Job ID',             value: `\`${job_id}\``,                        inline: true },
          { name: 'Estimated Time',      value: `~${estimated_seconds ?? 60}s`,         inline: true },
          { name: 'Type',               value: subcommand.toUpperCase(),                inline: true },
        )
        .setFooter({ text: 'Click "Check Status" once ready, or wait for the auto-notification.' })
        .setTimestamp()],
      components: [row],
    });
  } catch (err) {
    const msg = err.response?.data?.message || 'Deployment failed. Check server limits.';
    await interaction.editReply({ embeds: [errorEmbed('Deploy Failed', msg)], components: [] });
  }
}
