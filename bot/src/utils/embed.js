import { EmbedBuilder } from 'discord.js';

const COLORS = {
  success: 0x57F287,
  error:   0xED4245,
  warning: 0xFEE75C,
  info:    0x5865F2,
  loading: 0x99AAB5,
};

export function successEmbed(title, description, fields = []) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .addFields(fields)
    .setTimestamp();
}

export function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function infoEmbed(title, description, fields = []) {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .addFields(fields)
    .setTimestamp();
}

export function warningEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function loadingEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.loading)
    .setTitle(`⏳ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function serverStatusEmbed(server) {
  const statusEmoji = {
    running:  '🟢',
    starting: '🟡',
    stopping: '🟠',
    offline:  '🔴',
    error:    '💥',
  };

  const emoji = statusEmoji[server.status] || '❓';

  return new EmbedBuilder()
    .setColor(server.status === 'running' ? COLORS.success : COLORS.error)
    .setTitle(`${emoji} ${server.name}`)
    .addFields(
      { name: 'Status',      value: server.status.toUpperCase(),          inline: true },
      { name: 'Type',        value: server.type || 'Unknown',             inline: true },
      { name: 'Identifier',  value: `\`${server.identifier}\``,          inline: true },
      { name: 'CPU',         value: `${server.cpu ?? '—'}%`,             inline: true },
      { name: 'RAM',         value: formatBytes(server.memory_bytes),    inline: true },
      { name: 'Disk',        value: formatBytes(server.disk_bytes),      inline: true },
    )
    .setFooter({ text: `Server ID: ${server.pterodactyl_server_id}` })
    .setTimestamp();
}

function formatBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}
