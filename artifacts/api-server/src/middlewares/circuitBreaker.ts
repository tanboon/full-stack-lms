import { Request, Response, NextFunction } from "express";

interface RateEntry {
  count: number;
  windowStart: number;
}

// [3.3] In-memory Map — no external DB, pure Node.js
const requestMap = new Map<string, RateEntry>();

const MAX_REQUESTS = 5;
const WINDOW_MS = 10 * 1000; // 10 seconds

export const circuitBreaker = (req: Request, res: Response, next: NextFunction): void => {
  const ip = (req.ip ?? req.socket.remoteAddress ?? "unknown").replace(/^::ffff:/, "");
  const now = Date.now();
  const entry = requestMap.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // New window — reset counter
    requestMap.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    // [3.3] Return Status 429
    res.status(429).json({
      status: "error",
      message: `Too many requests. Max ${MAX_REQUESTS} per ${WINDOW_MS / 1000}s per IP.`,
      retryAfter,
    });
    return;
  }

  entry.count++;
  requestMap.set(ip, entry);
  next();
};
