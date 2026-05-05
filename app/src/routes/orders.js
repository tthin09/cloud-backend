// =============================================================================
// routes/orders.js — CRUD for /api/orders
// =============================================================================

const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/connection');
const { appEventsTotal } = require('../metrics');

const router = Router();

// ---- GET /api/orders — List orders (with optional status filter) ----
router.get('/', async (req, res, next) => {
  try {
    let sql = `
      SELECT o.uuid, o.user_uuid, o.product_uuid, o.quantity, o.total_price, o.status, o.created_at,
             u.username AS user_name,
             p.name     AS product_name
      FROM orders o
      LEFT JOIN users    u ON u.uuid = o.user_uuid
      LEFT JOIN products p ON p.uuid = o.product_uuid
    `;
    const params = [];
    if (req.query.status) {
      sql += ' WHERE o.status = ?';
      params.push(req.query.status);
    }
    sql += ' ORDER BY o.id DESC';
    const [rows] = await query(sql, params, 'SELECT', 'orders');
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// ---- GET /api/orders/:uuid ----
router.get('/:uuid', async (req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT o.uuid, o.user_uuid, o.product_uuid, o.quantity, o.total_price, o.status, o.created_at,
              u.username AS user_name, p.name AS product_name
       FROM orders o
       LEFT JOIN users    u ON u.uuid = o.user_uuid
       LEFT JOIN products p ON p.uuid = o.product_uuid
       WHERE o.uuid = ?`,
      [req.params.uuid],
      'SELECT',
      'orders'
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Order not found' } });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/orders — Place an order ----
router.post('/', async (req, res, next) => {
  try {
    const { user_uuid, product_uuid, quantity } = req.body;
    if (!user_uuid || !product_uuid) {
      return res.status(400).json({ success: false, error: { message: 'user_uuid and product_uuid are required' } });
    }

    // Verify user exists
    const [users] = await query('SELECT uuid FROM users WHERE uuid = ?', [user_uuid], 'SELECT', 'users');
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }

    // Verify product exists and has stock
    const [products] = await query('SELECT uuid, price, stock FROM products WHERE uuid = ?', [product_uuid], 'SELECT', 'products');
    if (products.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    const product = products[0];
    const qty = quantity || 1;
    if (product.stock < qty) {
      return res.status(400).json({ success: false, error: { message: 'Insufficient stock' } });
    }

    const totalPrice = parseFloat((product.price * qty).toFixed(2));
    const uuid = uuidv4();

    // Create order
    await query(
      'INSERT INTO orders (uuid, user_uuid, product_uuid, quantity, total_price, status) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid, user_uuid, product_uuid, qty, totalPrice, 'pending'],
      'INSERT',
      'orders'
    );

    // Reduce stock
    await query(
      'UPDATE products SET stock = stock - ? WHERE uuid = ?',
      [qty, product_uuid],
      'UPDATE',
      'products'
    );

    appEventsTotal.inc({ event_type: 'order_placed' });
    res.status(201).json({
      success: true,
      data: { uuid, user_uuid, product_uuid, quantity: qty, total_price: totalPrice, status: 'pending' },
    });
  } catch (err) {
    next(err);
  }
});

// ---- PATCH /api/orders/:uuid/status — Update order status ----
router.patch('/:uuid/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: { message: `status must be one of: ${validStatuses.join(', ')}` } });
    }
    const [result] = await query(
      'UPDATE orders SET status = ? WHERE uuid = ?',
      [status, req.params.uuid],
      'UPDATE',
      'orders'
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: { message: 'Order not found' } });
    }
    appEventsTotal.inc({ event_type: `order_${status}` });
    res.json({ success: true, message: `Order status updated to "${status}"` });
  } catch (err) {
    next(err);
  }
});

// ---- DELETE /api/orders/:uuid ----
router.delete('/:uuid', async (req, res, next) => {
  try {
    const [result] = await query('DELETE FROM orders WHERE uuid = ?', [req.params.uuid], 'DELETE', 'orders');
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: { message: 'Order not found' } });
    }
    appEventsTotal.inc({ event_type: 'order_deleted' });
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
