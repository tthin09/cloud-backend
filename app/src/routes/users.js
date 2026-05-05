// =============================================================================
// routes/users.js — CRUD for /api/users
// =============================================================================

const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/connection');
const { appEventsTotal } = require('../metrics');

const router = Router();

// ---- GET /api/users — List all users ----
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await query('SELECT uuid, username, email, full_name, role, created_at FROM users ORDER BY id DESC', [], 'SELECT', 'users');
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// ---- GET /api/users/:uuid — Get single user ----
router.get('/:uuid', async (req, res, next) => {
  try {
    const [rows] = await query('SELECT uuid, username, email, full_name, role, created_at FROM users WHERE uuid = ?', [req.params.uuid], 'SELECT', 'users');
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/users — Create user ----
router.post('/', async (req, res, next) => {
  try {
    const { username, email, full_name, role } = req.body;
    if (!username || !email) {
      return res.status(400).json({ success: false, error: { message: 'username and email are required' } });
    }
    const uuid = uuidv4();
    await query(
      'INSERT INTO users (uuid, username, email, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [uuid, username, email, full_name || null, role || 'user'],
      'INSERT',
      'users'
    );
    appEventsTotal.inc({ event_type: 'user_created' });
    res.status(201).json({ success: true, data: { uuid, username, email, full_name, role: role || 'user' } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: { message: 'Username or email already exists' } });
    }
    next(err);
  }
});

// ---- PUT /api/users/:uuid — Update user ----
router.put('/:uuid', async (req, res, next) => {
  try {
    const { username, email, full_name, role } = req.body;
    const [result] = await query(
      'UPDATE users SET username = COALESCE(?, username), email = COALESCE(?, email), full_name = COALESCE(?, full_name), role = COALESCE(?, role) WHERE uuid = ?',
      [username || null, email || null, full_name || null, role || null, req.params.uuid],
      'UPDATE',
      'users'
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }
    res.json({ success: true, message: 'User updated' });
  } catch (err) {
    next(err);
  }
});

// ---- DELETE /api/users/:uuid — Delete user ----
router.delete('/:uuid', async (req, res, next) => {
  try {
    const [result] = await query('DELETE FROM users WHERE uuid = ?', [req.params.uuid], 'DELETE', 'users');
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }
    appEventsTotal.inc({ event_type: 'user_deleted' });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
