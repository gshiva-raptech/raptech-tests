// parity/lib/config.mjs
// Loads instances.json and resolves per-instance credentials from .env.
// Credentials NEVER live in instances.json — only the names of the env vars do.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PARITY_DIR = path.resolve(__dirname, '..');
export const REPO_ROOT  = path.resolve(PARITY_DIR, '..');

// .env lives at the testing-repo root (gitignored). Load it explicitly so the
// runner works no matter what the current working directory is.
dotenv.config({ path: path.join(REPO_ROOT, '.env') });

export function loadInstances() {
  const file = path.join(PARITY_DIR, 'instances.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')).instances || {};
}

export function getInstance(name) {
  const instances = loadInstances();
  const inst = instances[name];
  if (!inst) {
    throw new Error(`Unknown instance "${name}". Known: ${Object.keys(instances).join(', ') || '(none)'}`);
  }
  if (inst.enabled === false) {
    throw new Error(`Instance "${name}" is disabled (enabled:false in instances.json — fill in its URLs/creds first).`);
  }
  return { name, ...inst };
}

// Resolve { user, pass } for an app ('migrated' | 'legacy') + role ('superadmin' | 'regular')
// by reading the env-var names declared in instances.json.
export function resolveCreds(inst, app, role) {
  const spec = inst.credentials?.[app]?.[role];
  if (!spec) throw new Error(`No credential mapping for ${app}/${role} on instance "${inst.name}".`);
  const user = process.env[spec.userEnv];
  const pass = process.env[spec.passEnv];
  if (!user || !pass) {
    throw new Error(
      `Missing env vars ${spec.userEnv} / ${spec.passEnv} for ${app}/${role} (instance "${inst.name}"). ` +
      `Add them to ${path.join(REPO_ROOT, '.env')}.`);
  }
  return { user, pass };
}

// Normalised base URLs.
export function migratedBase(inst)   { return (inst.migrated?.baseUrl || '').replace(/\/+$/, ''); }
export function legacyBase(inst)      { return (inst.legacy?.baseUrl   || '').replace(/\/+$/, ''); }
export function legacySignInUrl(inst) { return legacyBase(inst) + (inst.legacy?.signInPath || '/signIn'); }
