import { Router } from "express";
import mongoose from "mongoose";
import Course from "../models/Course.js";
import { protect } from "../middlewares/protect.js";
import { restrictTo } from "../middlewares/restrictTo.js";

const router = Router();

// [4.4] Multi-Tag Search & Pagination — uses MongoDB $all, skip/limit, returns totalPages
router.get("/courses", async (req, res) => {
  try {
    const { tags, category, level, page = "1", limit = "10", search } = req.query;
    const filter: Record<string, unknown> = {};

    if (tags) {
      // [4.4] $all operator — course must have ALL specified tags
      const tagArray = (tags as string).split(",").map((t) => t.trim());
      filter.tags = { $all: tagArray };
    }
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (search) filter.title = { $regex: search, $options: "i" };

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum; // [4.4] skip/limit

    const [courses, total] = await Promise.all([
      Course.find(filter).skip(skip).limit(limitNum).populate("instructor", "name email"),
      Course.countDocuments(filter),
    ]);

    res.json({
      status: "success",
      results: courses.length,
      total,
      totalPages: Math.ceil(total / limitNum), // [4.4] totalPages metadata
      currentPage: pageNum,
      data: courses,
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// [4.5] Aggregation Pipeline — MUST be before /:id to avoid conflict
router.get("/courses/stats/aggregation", protect, restrictTo("admin"), async (_req, res) => {
  try {
    // [4.5] $group + $avg aggregation pipeline
    const stats = await Course.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: "$category",
          totalCourses: { $sum: 1 },
          avgRating: { $avg: "$averageRating" },  // [4.5] $avg
          avgPrice: { $avg: "$price" },
          totalSeats: { $sum: "$seats" },
          totalEnrolled: { $sum: "$enrolledCount" },
          totalRevenue: { $sum: { $multiply: ["$price", "$enrolledCount"] } },
        },
      },
      { $sort: { avgRating: -1 } },
    ]);
    res.json({ status: "success", data: stats });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// [4.1] Get single course
router.get("/courses/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate("instructor", "name email");
    if (!course) return res.status(404).json({ status: "error", message: "Course not found." });
    res.json({ status: "success", data: course });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// [4.1] Create course with Mongoose schema validation (required, min, enum)
router.post("/courses", protect, restrictTo("admin", "instructor"), async (req, res) => {
  try {
    const course = await Course.create({ ...req.body, instructor: req.user!._id });
    res.status(201).json({ status: "success", data: course });
  } catch (err: any) {
    res.status(400).json({ status: "error", message: err.message });
  }
});

// [4.1] Update course (runs validators)
router.patch("/courses/:id", protect, restrictTo("admin", "instructor"), async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!course) return res.status(404).json({ status: "error", message: "Course not found." });
    res.json({ status: "success", data: course });
  } catch (err: any) {
    res.status(400).json({ status: "error", message: err.message });
  }
});

// [4.2] Soft Delete — sets isDeleted:true and deletedAt timestamp
router.delete("/courses/:id", protect, restrictTo("admin", "instructor"), async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() }, // [4.2] soft delete fields
      { new: true }
    );
    if (!course) return res.status(404).json({ status: "error", message: "Course not found." });
    res.json({ status: "success", message: "Course soft-deleted successfully.", data: null });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// [4.3] Atomic Enrollment — $inc + findOneAndUpdate + Transaction to prevent overselling
router.post("/courses/:id/enroll", protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction(); // [4.3] Mongoose transaction
  try {
    // [4.3] Atomic: only enroll if seats > 0, decrement atomically
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, seats: { $gt: 0 } },
      { $inc: { enrolledCount: 1, seats: -1 } }, // [4.3] $inc
      { new: true, session }
    );

    if (!course) {
      await session.abortTransaction();
      return res.status(409).json({ status: "error", message: "No seats available." });
    }

    await session.commitTransaction();
    res.json({ status: "success", message: "Enrolled successfully.", data: course });
  } catch (err: any) {
    await session.abortTransaction();
    res.status(500).json({ status: "error", message: err.message });
  } finally {
    session.endSession();
  }
});

// Add review to course
router.post("/courses/:id/reviews", protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ status: "error", message: "Course not found." });

    course.reviews.push({ user: req.user!._id as any, rating, comment, createdAt: new Date() });
    course.averageRating =
      course.reviews.reduce((sum, r) => sum + r.rating, 0) / course.reviews.length;
    await course.save();

    res.status(201).json({ status: "success", data: course });
  } catch (err: any) {
    res.status(400).json({ status: "error", message: err.message });
  }
});

export default router;
