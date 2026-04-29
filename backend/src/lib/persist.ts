/**
 * persist.ts – tiny file-backed JSON persistence helpers.
 *
 * Not a database. Suitable for testnet/dev where state is small and the process
 * is single-instance. Writes are synchronous-on-mutation (write-through),
 * which is fine for our throughput. Swap for SQLite/Postgres in production.
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function fileFor(name: string): string {
  ensureDataDir();
  return path.join(DATA_DIR, `${name}.json`);
}

export function loadJson<T>(name: string, fallback: T): T {
  const file = fileFor(name);
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[persist] Failed to load ${file}, using fallback:`, err);
    return fallback;
  }
}

export function saveJson<T>(name: string, value: T): void {
  const file = fileFor(name);
  const tmp = `${file}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, file);
  } catch (err) {
    console.error(`[persist] Failed to save ${file}:`, err);
  }
}

/**
 * PersistentMap<V>: a Map that mirrors itself to a JSON file on every mutation.
 * On construction, hydrates from the file if present.
 */
export class PersistentMap<V> {
  private readonly map: Map<string, V>;

  constructor(private readonly name: string) {
    const obj = loadJson<Record<string, V>>(name, {});
    this.map = new Map(Object.entries(obj));
  }

  get(key: string): V | undefined { return this.map.get(key); }
  has(key: string): boolean { return this.map.has(key); }
  values(): IterableIterator<V> { return this.map.values(); }
  keys(): IterableIterator<string> { return this.map.keys(); }
  get size(): number { return this.map.size; }

  set(key: string, value: V): this {
    this.map.set(key, value);
    this.flush();
    return this;
  }

  delete(key: string): boolean {
    const ok = this.map.delete(key);
    if (ok) this.flush();
    return ok;
  }

  private flush(): void {
    saveJson(this.name, Object.fromEntries(this.map));
  }
}
