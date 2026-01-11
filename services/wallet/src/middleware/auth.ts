import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "internal_service_key";

/**
 * Middleware to verify JWT token for user requests
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Middleware for internal service-to-service communication
 */
export function internalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers["x-internal-api-key"];

  if (!apiKey || apiKey !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Invalid internal API key" });
  }

  next();
}
