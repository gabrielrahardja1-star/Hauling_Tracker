import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from '../src/lib/db.js';

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

const passwordHash = await bcrypt.hash(password, 12);
const [user] = await query(
  `insert into users (email, password_hash, role)
   values ($1, $2, $3)
   on conflict (email)
   do update set password_hash = excluded.password_hash, role = excluded.role
   returning email, role, created_at`,
  [email.toLowerCase(), passwordHash, role]
);

console.log(`User ready: ${user.email} (${user.role})`);
process.exit(0);
