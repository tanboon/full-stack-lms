import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User.js";
import TokenBlacklist from "../models/TokenBlacklist.js";

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// [5.2 & 5.3] Double-Gate Login & Ghost Session middleware
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Gate 1: Extract token from HttpOnly cookie or Authorization header
  let token: string | undefined;
  if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401).json({ status: "error", message: "Not authenticated. Please log in." });
    return;
  }

  // [5.5] Check token blacklist before verifying
  const isBlacklisted = await TokenBlacklist.findOne({ token });
  if (isBlacklisted) {
    res.status(401).json({ status: "error", message: "Token revoked. Please log in again." });
    return;
  }

  // Gate 2: Verify JWT signature & expiry
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, secret) as JwtPayload;
  } catch {
    res.status(401).json({ status: "error", message: "Invalid or expired token." });
    return;
  }

  // Ghost check [5.3] — does user still exist in DB?
  const currentUser = await User.findById(decoded.id).select("+password +passwordChangedAt");
  if (!currentUser) {
    res.status(401).json({
      status: "error",
      message: "The user belonging to this token no longer exists (ghost session).",
    });
    return;
  }

  // [5.3] Password-changed-after check
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    res.status(401).json({
      status: "error",
      message: "Password was changed after login. Please log in again.",
    });
    return;
  }

  req.user = currentUser;
  next();
};
