import 'dotenv/config';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { query, insert } from '../src/lib/db.js';

const [email, password, role = 'admin'] = process.argv.slice(2);
const validRoles = ['stockpile_operator', 'jetty_operator', 'admin'];

if (!email || !password) {
  console.error('Usage: npm run user:upsert -- <username> <password> [role]');
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
const now = new Date().toISOString();

const existing = await query(
  `SELECT user_id, created_at FROM users FINAL WHERE email = {email: String} LIMIT 1`,
  { email: normalizedEmail }
);

const user_id = existing[0]?.user_id ?? randomUUID();
const created_at = existing[0]?.created_at ?? now;

await insert('users', [{
  user_id,
  email: normalizedEmail,
  password_hash: passwordHash,
  role,
  created_at,
  _updated_at: now,
}]);

console.log(`User ready: ${normalizedEmail} (${role})`);
process.exit(0);
