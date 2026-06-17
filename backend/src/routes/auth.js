import { randomUUID } from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../lib/db.js';
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
    `SELECT user_id, email, role, password_hash FROM users WHERE email = $1 LIMIT 1`,
    [email.toLowerCase()]
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
  const validRoles = ['stockpile_operator', 'jetty_operator', 'admin', 'analytics', 'site_jetty_operator', 'supervisor'];

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'email, password, and role are required' });
  }
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
  }

  const existing = await queryOne(
    `SELECT user_id FROM users WHERE email = $1 LIMIT 1`,
    [email.toLowerCase()]
  );
  if (existing) return res.status(409).json({ error: 'A user with that email already exists' });

  const password_hash = await bcrypt.hash(password, 12);
  const user_id = randomUUID();

  const [user] = await query(
    `INSERT INTO users (user_id, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING user_id, email, role, created_at`,
    [user_id, email.toLowerCase(), password_hash, role]
  );

  res.status(201).json(user);
});

// GET /auth/users — admin lists all users
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const users = await query(
    `SELECT user_id, email, role, created_at FROM users ORDER BY created_at ASC`
  );
  res.json(users);
});

// PATCH /auth/users/:id — admin updates a user's role or password
router.patch('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { role, password } = req.body;

  if (!role && !password) return res.status(400).json({ error: 'Nothing to update' });

  const current = await queryOne(`SELECT * FROM users WHERE user_id = $1`, [id]);
  if (!current) return res.status(404).json({ error: 'User not found' });

  const sets = [];
  const vals = [];
  let idx = 1;
  if (role)     { sets.push(`role = $${idx++}`);          vals.push(role); }
  if (password) { sets.push(`password_hash = $${idx++}`); vals.push(await bcrypt.hash(password, 12)); }
  vals.push(id);

  const [updated] = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE user_id = $${idx} RETURNING user_id, email, role, created_at`,
    vals
  );

  res.json(updated);
});

// DELETE /auth/users/:id — admin deletes a user
router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await query(`DELETE FROM users WHERE user_id = $1`, [req.params.id]);
  res.status(204).end();
});

export default router;
