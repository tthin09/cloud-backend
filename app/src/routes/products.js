// =============================================================================
// routes/products.js — CRUD for /api/products
// =============================================================================

const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/connection');
const { appEventsTotal } = require('../metrics');

const router = Router();

// ---- GET /api/products — List products (with optional category filter) ----
router.get('/', async (req, res, next) => {
  try {
    let sql = 'SELECT uuid, name, description, price, stock, category, created_at FROM products';
    const params = [];
    if (req.query.category) {
      sql += ' WHERE category = ?';
      params.push(req.query.category);
    }
    sql += ' ORDER BY id DESC';
    const [rows] = await query(sql, params, 'SELECT', 'products');
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// ---- GET /api/products/:uuid ----
router.get('/:uuid', async (req, res, next) => {
  try {
    const [rows] = await query('SELECT uuid, name, description, price, stock, category, created_at FROM products WHERE uuid = ?', [req.params.uuid], 'SELECT', 'products');
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/products ----
router.post('/', async (req, res, next) => {
  try {
    const { name, description, price, stock, category } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: { message: 'name and price are required' } });
    }
    const uuid = uuidv4();
    await query(
      'INSERT INTO products (uuid, name, description, price, stock, category) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid, name, description || null, price, stock || 0, category || 'general'],
      'INSERT',
      'products'
    );
    appEventsTotal.inc({ event_type: 'product_created' });
    res.status(201).json({ success: true, data: { uuid, name, description, price, stock: stock || 0, category: category || 'general' } });
  } catch (err) {
    next(err);
  }
});

// ---- PUT /api/products/:uuid ----
router.put('/:uuid', async (req, res, next) => {
  try {
    const { name, description, price, stock, category } = req.body;
    const [result] = await query(
      `UPDATE products SET 
        name = COALESCE(?, name), 
        description = COALESCE(?, description), 
        price = COALESCE(?, price), 
        stock = COALESCE(?, stock), 
        category = COALESCE(?, category) 
      WHERE uuid = ?`,
      [name || null, description || null, price ?? null, stock ?? null, category || null, req.params.uuid],
      'UPDATE',
      'products'
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    res.json({ success: true, message: 'Product updated' });
  } catch (err) {
    next(err);
  }
});

// ---- DELETE /api/products/:uuid ----
router.delete('/:uuid', async (req, res, next) => {
  try {
    const [result] = await query('DELETE FROM products WHERE uuid = ?', [req.params.uuid], 'DELETE', 'products');
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    appEventsTotal.inc({ event_type: 'product_deleted' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
