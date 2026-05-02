-- ============================================================
-- Pterodactyl Discord Bot — Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS pterodactyl_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pterodactyl_bot;

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  discord_id              VARCHAR(20)  NOT NULL UNIQUE,
  pterodactyl_user_id     INT UNSIGNED,
  pterodactyl_username    VARCHAR(255),
  pterodactyl_email       VARCHAR(320),
  role                    ENUM('user','vip','admin') NOT NULL DEFAULT 'user',
  server_limit            TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ptero_user_id (pterodactyl_user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- servers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servers (
  id                        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pterodactyl_server_id     INT UNSIGNED NOT NULL UNIQUE,
  pterodactyl_server_uuid   VARCHAR(36)  NOT NULL UNIQUE,
  pterodactyl_identifier    VARCHAR(8)   NOT NULL UNIQUE,
  owner_discord_id          VARCHAR(20)  NOT NULL,
  name                      VARCHAR(255) NOT NULL,
  type                      ENUM('minecraft','rust','csgo','terraria','custom') NOT NULL DEFAULT 'minecraft',
  status                    ENUM('starting','running','stopping','offline','error') NOT NULL DEFAULT 'offline',
  node_id                   INT UNSIGNED,
  last_seen_online          TIMESTAMP NULL,
  alert_sent                BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_discord_id) REFERENCES users(discord_id) ON DELETE CASCADE,
  INDEX idx_owner (owner_discord_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- deploy_queue  (mirrors BullMQ jobs for persistence/audit)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deploy_queue (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id         VARCHAR(64)  NOT NULL UNIQUE,
  discord_id     VARCHAR(20)  NOT NULL,
  server_type    VARCHAR(50)  NOT NULL,
  server_name    VARCHAR(255) NOT NULL,
  version        VARCHAR(32)  NOT NULL DEFAULT 'latest',
  status         ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  error_message  TEXT,
  result         JSON,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_discord_id (discord_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- audit_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  discord_id   VARCHAR(20),
  action       VARCHAR(100) NOT NULL,
  target_type  ENUM('server','user','system') NOT NULL,
  target_id    VARCHAR(255),
  details      JSON,
  ip_address   VARCHAR(45),
  success      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_discord_id (discord_id),
  INDEX idx_action_time (action, created_at),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;
