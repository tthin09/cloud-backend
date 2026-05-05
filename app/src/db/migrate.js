// =============================================================================
// db/migrate.js — Create tables if they don't exist
// =============================================================================
// Usage:  node src/db/migrate.js
//         npm run migrate
// =============================================================================

require('dotenv').config();
const { getPool } = require('./connection');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    uuid        VARCHAR(36)  NOT NULL UNIQUE,
    username    VARCHAR(100) NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    full_name   VARCHAR(255) DEFAULT NULL,
    role        ENUM('admin','user','viewer') DEFAULT 'user',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  `CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    uuid        VARCHAR(36)   NOT NULL UNIQUE,
    name        VARCHAR(255)  NOT NULL,
    description TEXT,
    price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock       INT           NOT NULL DEFAULT 0,
    category    VARCHAR(100)  DEFAULT 'general',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  `CREATE TABLE IF NOT EXISTS orders (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    uuid        VARCHAR(36)  NOT NULL UNIQUE,
    user_uuid   VARCHAR(36)  NOT NULL,
    product_uuid VARCHAR(36) NOT NULL,
    quantity    INT          NOT NULL DEFAULT 1,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status      ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_uuid   (user_uuid),
    INDEX idx_product_uuid (product_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
];

async function migrate() {
  const pool = getPool();
  console.log('🔄 Running migrations...');
  for (const sql of TABLES) {
    await pool.execute(sql);
  }
  console.log('✅ Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
