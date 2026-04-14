/**
 * auth.ts – Middleware
 *
 * internalOnly   – gates routes that must only be called server-side
 *                  (bridge watcher callbacks, admin endpoints)
 * validateBody   – Zod schema validation helper
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { config } from '../config';

export function internalOnly(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-internal-secret'];
  if (secret !== config.apiSecret) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: err.errors });
        return;
      }
      next(err);
    }
  };
}
