import { apiGet } from '../utils/apiClient.js';
import { successEmbed, errorEmbed } from '../utils/embed.js';
import logger from '../utils/logger.js';

export const name = 'interactionCreate';
export const once = false;

export async function execute(interaction, client) {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (err) {
      logger.error('Command execution error', { command: interaction.commandName, err: err.message });
      const reply = { embeds: [errorEmbed('Error', 'An unexpected error occurred.')], ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply);
      } else {
        await interaction.reply(reply);
      }
    }
    return;
  }

  // Button interactions
  if (interaction.isButton()) {
    const [action, ...args] = interaction.customId.split(':');

    if (action === 'deploy_check') {
      const jobId = args[0];
      await interaction.deferUpdate();

      try {
        const { job } = await apiGet(`/api/deploy/status/${jobId}`);

        if (job.status === 'completed') {
          const creds = job.result;
          await interaction.editReply({
            embeds: [successEmbed('Server Ready!', `Your server **${creds.name}** is live.`, [
              { name: 'Panel URL',   value: creds.panel_url,             inline: false },
              { name: 'Identifier', value: `\`${creds.identifier}\``,   inline: true  },
              { name: 'Username',   value: creds.username,               inline: true  },
              { name: 'Password',   value: `||${creds.password}||`,      inline: true  },
              { name: 'IP:Port',    value: `\`${creds.ip}:${creds.port}\``, inline: false },
            ])],
            components: [],
          });
        } else if (job.status === 'failed') {
          await interaction.editReply({
            embeds: [errorEmbed('Deploy Failed', job.error_message || 'Unknown error.')],
            components: [],
          });
        } else {
          await interaction.editReply({
            content: `⏳ Still processing... Status: **${job.status}**`,
          });
        }
      } catch (err) {
        logger.error('Deploy check failed', { jobId, err: err.message });
      }
    }
  }
}
