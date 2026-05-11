/**
 * auth.ts – Middleware
 *
 * internalOnly   – gates routes that must only be called server-side
 *                  (bridge watcher callbacks, admin endpoints)
 * validateBody   – Zod schema validation helper
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { timingSafeEqual } from 'crypto';
import { config } from '../config';

const EXPECTED_SECRET = Buffer.from(config.apiSecret, 'utf8');

export function internalOnly(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers['x-internal-secret'];
  if (typeof provided !== 'string') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const providedBuf = Buffer.from(provided, 'utf8');
  if (providedBuf.length !== EXPECTED_SECRET.length || !timingSafeEqual(providedBuf, EXPECTED_SECRET)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * In prod, returns undefined so the field is omitted from the JSON response
 * (no internal exception text leaks). In dev, returns the stringified error
 * so the developer can debug.
 *
 * Usage: res.status(502).json({ error: 'Chain unreachable', detail: errorDetail(err) })
 */
export function errorDetail(err: unknown): string | undefined {
  if (IS_PROD) return undefined;
  return String(err);
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // In prod, hide the schema shape (path/code/validation type) — attackers
        // use it to probe endpoint internals. Return only field names.
        const body = IS_PROD
          ? { error: 'Validation error', fields: [...new Set(err.errors.map((e) => e.path.join('.')))] }
          : { error: 'Validation error', details: err.errors };
        res.status(400).json(body);
        return;
      }
      next(err);
    }
  };
}
