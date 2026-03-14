import { Router, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import TokenBlacklist from "../models/TokenBlacklist.js";
import { protect } from "../middlewares/protect.js";

const router = Router();

const signToken = (id: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  return jwt.sign({ id }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as string,
  } as jwt.SignOptions);
};

const sendTokenCookie = (token: string, res: Response) => {
  // [5.2] Issue JWT via HttpOnly cookie
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// [5.1] Secure Registration — bcrypt handled by Mongoose pre-save hook
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await User.create({ name, email, password, role });
    const token = signToken(String(user._id));
    sendTokenCookie(token, res);
    res.status(201).json({
      status: "success",
      token,
      data: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ status: "error", message: "Email already exists." });
    }
    res.status(400).json({ status: "error", message: err.message });
  }
});

// [5.2 & 5.5] Double-Gate Login with Artificial Latency (anti-brute force)
router.post("/auth/login", async (req, res) => {
  try {
    // [5.5] Artificial latency — slows down brute force attempts
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: "error", message: "Email and password are required." });
    }

    // select: false on password — must explicitly select it
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({ status: "error", message: "Incorrect email or password." });
    }

    const token = signToken(String(user._id));
    sendTokenCookie(token, res);
    res.json({
      status: "success",
      token,
      data: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// [5.5] Logout — blacklist the token so it can never be reused
router.post("/auth/logout", protect, async (req, res) => {
  try {
    const token = req.cookies?.jwt || req.headers.authorization?.split(" ")[1];
    if (token) {
      await TokenBlacklist.create({ token });
    }
    res.clearCookie("jwt");
    res.json({ status: "success", message: "Logged out. Token blacklisted." });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Get current authenticated user
router.get("/auth/me", protect, (req, res) => {
  res.json({ status: "success", data: req.user });
});

export default router;
