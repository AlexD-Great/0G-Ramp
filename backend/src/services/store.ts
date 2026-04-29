/**
 * store.ts – shared persistent stores used by routes + watcher.
 *
 * Centralised so the bridge watcher and the /api/transactions route both read
 * and write the same state. Backed by JSON files under backend/data/.
 */

import { PersistentMap } from '../lib/persist';
import { RampTransaction } from '../types';

export const txStore = new PersistentMap<RampTransaction>('transactions');
