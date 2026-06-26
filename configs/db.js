import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Database connection string not configured');
}
const sql = neon(connectionString, {
  fetchConnectionCache: true,
  fullResults: true,
});

export const db = drizzle(sql);
