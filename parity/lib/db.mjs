// parity/lib/db.mjs
// Thin psql helper for cases that need to seed/inspect the LOCAL dev database
// (e.g. the delete-guard precondition). SQL is piped on stdin (-f -) so there is
// no shell-quoting hazard. LOCAL ONLY — production instances must not be seeded.
import { execSync } from 'child_process';

const DB = {
  host: process.env.PARITY_DB_HOST || '127.0.0.1',
  port: process.env.PARITY_DB_PORT || '5432',
  user: process.env.PARITY_DB_USER || 'raptech',
  name: process.env.PARITY_DB_NAME || 'raptech_v1',
  pass: process.env.PARITY_DB_PASSWORD || '',
};

// Run SQL and return trimmed stdout. -q suppresses command tags ("INSERT 0 1"),
// -tA = tuples only, unaligned → clean RETURNING/SELECT output.
export function psql(sql) {
  return execSync(
    `psql -h ${DB.host} -p ${DB.port} -U ${DB.user} -d ${DB.name} -qtA -v ON_ERROR_STOP=1 -f -`,
    { input: sql, env: { ...process.env, PGPASSWORD: DB.pass }, encoding: 'utf8' },
  ).trim();
}

// Run SQL expected to RETURN a single scalar; returns the first all-digits line.
export function psqlScalar(sql) {
  const out = psql(sql);
  const line = out.split('\n').map(s => s.trim()).find(s => /^\d+$/.test(s));
  return line || out;
}

export const DB_INFO = DB;
