import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Force use of Azure PostgreSQL database (override Replit DATABASE_URL)
const AZURE_DATABASE_URL =
  'postgresql://indx1user:indx1pass@20.253.71.83/indx1base?sslmode=disable';

console.log('Using Azure PostgreSQL database at 20.253.71.83');

export const pool = new Pool({
  connectionString: AZURE_DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Ensure autocommit is enabled for writes to persist
  query_timeout: 10000,
});
export const db = drizzle(pool, { schema });
