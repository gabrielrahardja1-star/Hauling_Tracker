import 'dotenv/config';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../src/lib/db.js';

const [email, password, role = 'admin'] = process.argv.slice(2);
const validRoles = ['stockpile_operator', 'jetty_operator', 'admin', 'analytics', 'site_jetty_operator', 'supervisor'];

if (!email || !password) {
  console.error('Usage: npm run user:upsert -- <email> <password> [role]');
  console.error(`Roles: ${validRoles.join(', ')}`);
  process.exit(1);
}

if (!validRoles.includes(role)) {
  console.error(`Role must be one of: ${validRoles.join(', ')}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not configured. Create backend/.env first.');
  process.exit(1);
}

const normalizedEmail = email.toLowerCase();
const passwordHash = await bcrypt.hash(password, 12);

const existing = await queryOne(
  `SELECT user_id FROM users WHERE email = $1 LIMIT 1`,
  [normalizedEmail]
);

if (existing) {
  await query(
    `UPDATE users SET password_hash = $1, role = $2 WHERE user_id = $3`,
    [passwordHash, role, existing.user_id]
  );
  console.log(`Updated: ${normalizedEmail} (${role})`);
} else {
  await query(
    `INSERT INTO users (user_id, email, password_hash, role) VALUES ($1, $2, $3, $4)`,
    [randomUUID(), normalizedEmail, passwordHash, role]
  );
  console.log(`Created: ${normalizedEmail} (${role})`);
}

process.exit(0);
