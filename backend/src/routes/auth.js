import { randomUUID } from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne, insert, client } from '../lib/db.js';
import { wrapAsyncRoutes } from '../lib/asyncRouter.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
wrapAsyncRoutes(router);

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await queryOne(
    `SELECT user_id, email, role, password_hash
     FROM users FINAL
     WHERE email = {email: String}
     LIMIT 1`,
    { email: email.toLowerCase() }
  );

  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = signToken(user);
  res.json({
    token,
    user: { user_id: user.user_id, email: user.email, role: user.role },
  });
});

// POST /auth/users — admin creates a user
router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { email, password, role } = req.body;
  const validRoles = ['stockpile_operator', 'jetty_operator', 'admin', 'analytics'];

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'email, password, and role are required' });
  }
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
  }

  const existing = await queryOne(
    `SELECT user_id FROM users FINAL WHERE email = {email: String} LIMIT 1`,
    { email: email.toLowerCase() }
  );
  if (existing) return res.status(409).json({ error: 'A user with that email already exists' });

  const password_hash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  const user_id = randomUUID();

  await insert('users', [{
    user_id,
    email: email.toLowerCase(),
    password_hash,
    role,
    created_at: now,
    _updated_at: now,
  }]);

  res.status(201).json({ user_id, email: email.toLowerCase(), role, created_at: now });
});

// GET /auth/users — admin lists all users
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const users = await query(
    `SELECT user_id, email, role, created_at
     FROM users FINAL
     ORDER BY created_at ASC`
  );
  res.json(users);
});

// PATCH /auth/users/:id — admin updates a user's role or password
router.patch('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { role, password } = req.body;

  if (!role && !password) return res.status(400).json({ error: 'Nothing to update' });

  const current = await queryOne(
    `SELECT * FROM users FINAL WHERE user_id = {id: UUID} LIMIT 1`,
    { id }
  );
  if (!current) return res.status(404).json({ error: 'User not found' });

  const updated = { ...current };
  if (role) updated.role = role;
  if (password) updated.password_hash = await bcrypt.hash(password, 12);
  updated._updated_at = new Date().toISOString();

  await insert('users', [updated]);

  res.json({
    user_id: updated.user_id,
    email: updated.email,
    role: updated.role,
    created_at: updated.created_at,
  });
});

// DELETE /auth/users/:id — admin deletes a user
// ClickHouse mutations are async; the row is removed at next merge
router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await client.command({
    query: `ALTER TABLE users DELETE WHERE user_id = {id: UUID}`,
    query_params: { id: req.params.id },
  });
  res.status(204).end();
});

export default router;
