import { Request, Response, NextFunction } from 'express';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal_service_key';

/**
 * Middleware for internal service-to-service communication
 * Validates the x-internal-api-key header
 */
export function internalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-internal-api-key'];

  if (!apiKey || apiKey !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Invalid internal API key' });
  }

  next();
}
