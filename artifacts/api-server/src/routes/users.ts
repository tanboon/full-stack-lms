import { Router } from "express";
import User from "../models/User.js";
import { protect } from "../middlewares/protect.js";
import { restrictTo } from "../middlewares/restrictTo.js";

const router = Router();

// GET /api/users — Admin: list all users with search and pagination
router.get("/users", protect, restrictTo("admin"), async (req, res) => {
  try {
    const { search, role, page = "1", limit = "10" } = req.query;
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) filter.role = role;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limitNum).select("-password"),
      User.countDocuments(filter),
    ]);

    res.json({
      status: "success",
      results: users.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: users,
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// PATCH /api/users/:id — Admin: update user role
router.patch("/users/:id", protect, restrictTo("admin"), async (req, res) => {
  try {
    const { name, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, role },
      { new: true, runValidators: true }
    ).select("-password");
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });
    res.json({ status: "success", data: user });
  } catch (err: any) {
    res.status(400).json({ status: "error", message: err.message });
  }
});

// DELETE /api/users/:id — Admin: soft delete user [4.2]
router.delete("/users/:id", protect, restrictTo("admin"), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });
    res.json({ status: "success", message: "User soft-deleted.", data: null });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
