-- ============================================================
-- MAKENOV 제휴(affiliate, CTV) 프로그램 — 수동 적용용 SQL (MySQL 5.6)
-- ------------------------------------------------------------
-- 원본은 app/Database/Migrations/2026-09-09-0000{17..23}_*.php 이며, 서버에서
-- `php spark migrate` 가 안 될 때 이 파일을 그대로 실행하면 같은 결과가 된다.
-- Api\Aff 컨트롤러는 첫 요청 때 테이블이 없으면 마이그레이션을 스스로 시도하고,
-- DDL 권한이 없으면 {"error":"schema_missing"} 을 돌려준다 — 그때 이 파일을 쓴다.
-- 실행 후 migrations 테이블에도 기록해 두면(맨 아래) spark migrate 가 중복 실행하지 않는다.
-- ============================================================

CREATE TABLE IF NOT EXISTS `aff_marketers` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(8) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(120) NULL,
  `phone` VARCHAR(40) NULL,
  `zalo` VARCHAR(40) NULL,
  `bank_name` VARCHAR(120) NULL,
  `bank_account` VARCHAR(60) NULL,
  `bank_holder` VARCHAR(120) NULL,
  `status` VARCHAR(12) NOT NULL DEFAULT 'active',
  `memo` TEXT NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `aff_tokens` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `marketer_id` CHAR(36) NOT NULL,
  `access_token` VARCHAR(64) NOT NULL,
  `refresh_token` VARCHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `marketer_id` (`marketer_id`),
  KEY `access_token` (`access_token`),
  KEY `refresh_token` (`refresh_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `aff_campaigns` (
  `product_id` VARCHAR(64) NOT NULL,
  `cpa_vnd` INT(11) NOT NULL DEFAULT 0,
  `cap` INT(11) NULL,
  `headline` VARCHAR(255) NULL,
  `materials` TEXT NULL,
  `copy_text` TEXT NULL,
  `keywords` TEXT NULL,
  `rules` TEXT NULL,
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `sort` INT(11) NOT NULL DEFAULT 99,
  `active` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `aff_clicks` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(8) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL DEFAULT '',
  `ch` VARCHAR(16) NOT NULL DEFAULT '',
  `day` DATE NOT NULL,
  `ua_hash` CHAR(32) NOT NULL,
  `created_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `code_day` (`code`,`day`),
  UNIQUE KEY `code_product_id_day_ua_hash` (`code`,`product_id`,`day`,`ua_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `aff_leads` (
  `id` CHAR(36) NOT NULL,
  `inquiry_id` CHAR(36) NOT NULL,
  `marketer_id` CHAR(36) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `buyer_id` CHAR(36) NULL,
  `ch` VARCHAR(16) NOT NULL DEFAULT '',
  `status` VARCHAR(12) NOT NULL DEFAULT 'pending',
  `amount_vnd` INT(11) NOT NULL DEFAULT 0,
  `reject_reason` VARCHAR(255) NULL,
  `decided_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `marketer_id` (`marketer_id`),
  KEY `product_id` (`product_id`),
  KEY `status` (`status`),
  UNIQUE KEY `inquiry_id` (`inquiry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `aff_withdrawals` (
  `id` CHAR(36) NOT NULL,
  `marketer_id` CHAR(36) NOT NULL,
  `amount_vnd` INT(11) NOT NULL DEFAULT 0,
  `bank_snapshot` TEXT NULL,
  `status` VARCHAR(12) NOT NULL DEFAULT 'requested',
  `memo` VARCHAR(255) NULL,
  `paid_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `marketer_id` (`marketer_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- inquiries 에 마케터 코드·채널 (이미 있으면 이 두 줄은 건너뛴다)
ALTER TABLE `inquiries` ADD COLUMN `aff_ch` VARCHAR(16) NULL AFTER `memo`;
ALTER TABLE `inquiries` ADD COLUMN `aff_ref` VARCHAR(8) NULL AFTER `memo`;

-- 8/19 의 products.negotiable 도 아직 없다면 함께
-- ALTER TABLE `products` ADD COLUMN `negotiable` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_new`;

-- spark migrate 중복 실행 방지 (migrations 테이블 batch 는 현재 최대값+1 로)
-- INSERT INTO migrations (version, class, `group`, namespace, time, batch) VALUES
--  ('2026-09-09-000017','App\\Database\\Migrations\\CreateAffMarketers','default','App',UNIX_TIMESTAMP(),99),
--  ('2026-09-09-000018','App\\Database\\Migrations\\CreateAffTokens','default','App',UNIX_TIMESTAMP(),99),
--  ('2026-09-09-000019','App\\Database\\Migrations\\CreateAffCampaigns','default','App',UNIX_TIMESTAMP(),99),
--  ('2026-09-09-000020','App\\Database\\Migrations\\CreateAffClicks','default','App',UNIX_TIMESTAMP(),99),
--  ('2026-09-09-000021','App\\Database\\Migrations\\CreateAffLeads','default','App',UNIX_TIMESTAMP(),99),
--  ('2026-09-09-000022','App\\Database\\Migrations\\CreateAffWithdrawals','default','App',UNIX_TIMESTAMP(),99),
--  ('2026-09-09-000023','App\\Database\\Migrations\\AddAffRefToInquiries','default','App',UNIX_TIMESTAMP(),99);
