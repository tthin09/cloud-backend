// =============================================================================
// db/seed.js — Populate tables with sample data for demo purposes
// =============================================================================
// Usage:  node src/db/seed.js
//         npm run seed
// =============================================================================

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('./connection');

const USERS = [
  { username: 'admin', email: 'admin@example.com', full_name: 'Admin User', role: 'admin' },
  { username: 'alice', email: 'alice@example.com', full_name: 'Alice Nguyen', role: 'user' },
  { username: 'bob',   email: 'bob@example.com',   full_name: 'Bob Tran',    role: 'user' },
  { username: 'carol', email: 'carol@example.com', full_name: 'Carol Le',    role: 'viewer' },
  { username: 'dave',  email: 'dave@example.com',  full_name: 'Dave Pham',   role: 'user' },
];

const PRODUCTS = [
  { name: 'Wireless Mouse',      description: 'Ergonomic wireless mouse',     price: 29.99,  stock: 150, category: 'electronics' },
  { name: 'Mechanical Keyboard', description: 'RGB mechanical keyboard',      price: 89.99,  stock: 75,  category: 'electronics' },
  { name: 'USB-C Hub',           description: '7-in-1 USB-C hub',             price: 45.50,  stock: 200, category: 'electronics' },
  { name: 'Monitor Stand',       description: 'Adjustable monitor stand',     price: 34.99,  stock: 120, category: 'accessories' },
  { name: 'Desk Lamp',           description: 'LED desk lamp with USB port',  price: 24.99,  stock: 300, category: 'accessories' },
  { name: 'Laptop Bag',          description: 'Water-resistant laptop bag',    price: 55.00,  stock: 90,  category: 'accessories' },
  { name: 'Webcam HD',           description: '1080p HD webcam',              price: 65.00,  stock: 60,  category: 'electronics' },
  { name: 'Headset Pro',         description: 'Noise-cancelling headset',     price: 119.99, stock: 45,  category: 'electronics' },
  { name: 'Mouse Pad XL',        description: 'Extended mouse pad',           price: 15.99,  stock: 500, category: 'accessories' },
  { name: 'Cable Organizer',     description: 'Silicone cable organizer set', price: 9.99,   stock: 800, category: 'accessories' },
];

async function seed() {
  const pool = getPool();
  console.log('🌱 Seeding database...');

  // Seed users
  const userUuids = [];
  for (const u of USERS) {
    const uuid = uuidv4();
    userUuids.push(uuid);
    await pool.execute(
      `INSERT IGNORE INTO users (uuid, username, email, full_name, role) VALUES (?, ?, ?, ?, ?)`,
      [uuid, u.username, u.email, u.full_name, u.role]
    );
  }

  // Seed products
  const productUuids = [];
  for (const p of PRODUCTS) {
    const uuid = uuidv4();
    productUuids.push(uuid);
    await pool.execute(
      `INSERT IGNORE INTO products (uuid, name, description, price, stock, category) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, p.name, p.description, p.price, p.stock, p.category]
    );
  }

  // Seed some orders
  const statuses = ['pending', 'processing', 'shipped', 'delivered'];
  for (let i = 0; i < 15; i++) {
    const userUuid = userUuids[Math.floor(Math.random() * userUuids.length)];
    const productUuid = productUuids[Math.floor(Math.random() * productUuids.length)];
    const qty = Math.floor(Math.random() * 5) + 1;
    const price = parseFloat((Math.random() * 200 + 10).toFixed(2));
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    await pool.execute(
      `INSERT INTO orders (uuid, user_uuid, product_uuid, quantity, total_price, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), userUuid, productUuid, qty, price, status]
    );
  }

  console.log(`✅ Seeded ${USERS.length} users, ${PRODUCTS.length} products, 15 orders.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
