import { query } from '../../database/connection.js';
import {
  createServer,
  getAvailableAllocation,
} from '../../services/pterodactylService.js';
import { canUserCreateServer } from '../../services/userService.js';
import logger from '../../utils/logger.js';
import { randomBytes } from 'crypto';

const EGG_MAP = {
  minecraft: { eggId: parseInt(process.env.PTERO_MINECRAFT_EGG_ID || '1'), dockerImage: 'ghcr.io/pterodactyl/yolks:java_17' },
  rust:      { eggId: parseInt(process.env.PTERO_RUST_EGG_ID      || '2'), dockerImage: 'ghcr.io/pterodactyl/yolks:steam' },
  terraria:  { eggId: parseInt(process.env.PTERO_TERRARIA_EGG_ID  || '3'), dockerImage: 'ghcr.io/pterodactyl/yolks:mono' },
};

const RESOURCE_MAP = {
  minecraft: {
    memory: parseInt(process.env.MINECRAFT_MEMORY || '2048'),
    disk:   parseInt(process.env.MINECRAFT_DISK   || '10240'),
    cpu:    parseInt(process.env.MINECRAFT_CPU     || '100'),
  },
  rust: {
    memory: parseInt(process.env.RUST_MEMORY || '4096'),
    disk:   parseInt(process.env.RUST_DISK   || '20480'),
    cpu:    parseInt(process.env.RUST_CPU     || '200'),
  },
  terraria: {
    memory: parseInt(process.env.TERRARIA_MEMORY || '1024'),
    disk:   parseInt(process.env.TERRARIA_DISK   || '5120'),
    cpu:    parseInt(process.env.TERRARIA_CPU     || '100'),
  },
};

const STARTUP_COMMANDS = {
  minecraft: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -jar server.jar --nogui',
  rust:      './RustDedicated -batchmode +server.port {{SERVER_PORT}} +server.maxplayers 50',
  terraria:  'mono TerrariaServer.exe -port {{SERVER_PORT}} -maxplayers 10',
};

export async function processDeploy(job) {
  const { jobId, discordId, type, name, version } = job.data;

  await query(
    'UPDATE deploy_queue SET status = "processing" WHERE job_id = ?',
    [jobId]
  );

  try {
    // Re-check user limits (guard against race conditions)
    const { allowed, reason, user } = await canUserCreateServer(discordId);
    if (!allowed) throw new Error(reason);

    const nodeId = parseInt(process.env.PTERO_DEFAULT_NODE_ID || '1');
    const allocation = await getAvailableAllocation(nodeId);
    if (!allocation) throw new Error('No available allocations. Contact an administrator.');

    const eggConfig      = EGG_MAP[type];
    const resourceConfig = RESOURCE_MAP[type];
    if (!eggConfig) throw new Error(`Unsupported server type: ${type}`);

    const environment = buildEnvironment(type, version);

    logger.info('Creating Pterodactyl server', { discordId, type, name, userId: user.pterodactyl_user_id });

    const server = await createServer({
      name,
      userId:       user.pterodactyl_user_id,
      eggId:        eggConfig.eggId,
      nestId:       parseInt(process.env.PTERO_DEFAULT_NEST_ID || '1'),
      environment,
      memory:       resourceConfig.memory,
      disk:         resourceConfig.disk,
      cpu:          resourceConfig.cpu,
      allocationId: allocation.id,
    });

    // Persist in our DB
    await query(`
      INSERT INTO servers
        (pterodactyl_server_id, pterodactyl_server_uuid, pterodactyl_identifier, owner_discord_id, name, type, status, node_id)
      VALUES (?, ?, ?, ?, ?, ?, 'starting', ?)
    `, [server.id, server.uuid, server.identifier, discordId, name, type, nodeId]);

    const result = {
      name,
      identifier:  server.identifier,
      uuid:        server.uuid,
      panel_url:   `${process.env.PTERODACTYL_URL}/server/${server.identifier}`,
      ip:          allocation.ip,
      port:        allocation.port,
      username:    user.pterodactyl_username,
      password:    '(use Pterodactyl panel password)',
    };

    await query(
      'UPDATE deploy_queue SET status = "completed", result = ? WHERE job_id = ?',
      [JSON.stringify(result), jobId]
    );

    logger.info('Deploy completed', { jobId, discordId, identifier: server.identifier });
    return result;
  } catch (err) {
    await query(
      'UPDATE deploy_queue SET status = "failed", error_message = ? WHERE job_id = ?',
      [err.message, jobId]
    );
    logger.error('Deploy job failed', { jobId, err: err.message });
    throw err;
  }
}

function buildEnvironment(type, version) {
  const base = {
    minecraft: {
      SERVER_JARFILE: 'server.jar',
      MC_VERSION:     version === 'latest' ? 'latest' : version,
      BUILD_NUMBER:   'latest',
      STARTUP_CMD:    STARTUP_COMMANDS.minecraft,
    },
    rust: {
      STARTUP_CMD:   STARTUP_COMMANDS.rust,
      WORLD_SEED:    randomBytes(4).readUInt32BE(0).toString(),
    },
    terraria: {
      STARTUP_CMD: STARTUP_COMMANDS.terraria,
    },
  };
  return base[type] || {};
}
