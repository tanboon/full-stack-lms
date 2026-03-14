import { Router } from "express";
import { protect } from "../middlewares/protect.js";
import { restrictTo } from "../middlewares/restrictTo.js";
import { Exam } from "../models/Exam.js";
import { ExamSubmission } from "../models/ExamSubmission.js";
import Course from "../models/Course.js";

const router = Router();

// [6.5] Dynamic Form Engine — JSON schema drives the exam creation UI
// Populates courseId options dynamically from real MongoDB courses
// NOTE: No auth required — this is just structural metadata for the form
router.get("/exam/schema", async (_req, res) => {
  const courses = await Course.find({}).select("title _id").lean();
  const courseOptions = courses.map((c: any) => ({
    value: String(c._id),
    label: c.title,
  }));

  const schema = {
    title: "Exam Creation Schema",
    fields: [
      {
        key: "examTitle",
        label: "Exam Title",
        type: "text",
        required: true,
        placeholder: "e.g. Midterm: Database Systems",
        validation: { minLength: 5 },
      },
      {
        key: "courseId",
        label: "Linked Course",
        type: "select",
        required: true,
        options: courseOptions,
        placeholder: "Select a course...",
      },
      {
        key: "role",
        label: "Who Can Take This Exam",
        type: "select",
        required: true,
        options: [
          { value: "student", label: "Students Only" },
          { value: "admin", label: "Admins Only" },
        ],
        placeholder: "Select role...",
      },
      {
        key: "adminPasscode",
        label: "Admin Passcode",
        type: "text",
        required: false,
        placeholder: "Min 4 characters",
        conditionalOn: { field: "role", value: "admin" },
        validation: { minLength: 4 },
      },
      {
        key: "duration",
        label: "Duration (minutes)",
        type: "number",
        required: true,
        placeholder: "e.g. 60",
        validation: { min: 5, max: 180 },
      },
      {
        key: "passingScore",
        label: "Passing Score (%)",
        type: "number",
        required: true,
        placeholder: "e.g. 70",
        validation: { min: 0, max: 100 },
      },
      {
        key: "shuffleQuestions",
        label: "Shuffle Questions",
        type: "boolean",
      },
      {
        key: "instructions",
        label: "Instructions",
        type: "object",
        nestedFields: [
          { key: "en", label: "English Instructions", type: "textarea", placeholder: "Instructions in English..." },
          { key: "ar", label: "Arabic Instructions", type: "textarea", placeholder: "تعليمات باللغة العربية..." },
        ],
      },
      {
        key: "questions",
        label: "Questions",
        type: "array",
        required: true,
        minItems: 1,
        itemSchema: {
          fields: [
            { key: "text", label: "Question Text", type: "text", required: true, placeholder: "Enter question..." },
            {
              key: "type",
              label: "Question Type",
              type: "select",
              required: true,
              options: [
                { value: "mcq", label: "Multiple Choice" },
                { value: "truefalse", label: "True / False" },
                { value: "short", label: "Short Answer" },
              ],
              placeholder: "Select type...",
            },
            {
              key: "options",
              label: "Answer Options (comma-separated)",
              type: "text",
              required: false,
              placeholder: "Option A, Option B, Option C, Option D",
              conditionalOn: { field: "type", value: "mcq" },
            },
            { key: "correctAnswer", label: "Correct Answer", type: "text", required: true, placeholder: "e.g. Option A or True" },
            { key: "points", label: "Points", type: "number", required: true, placeholder: "e.g. 10" },
          ],
        },
      },
    ],
  };

  res.json({ status: "success", schema });
});

// GET /api/exams — list all exams (with course info)
router.get("/exams", protect, async (_req, res) => {
  const exams = await Exam.find({}).populate("courseId", "title").lean();
  res.json({ status: "success", results: exams.length, data: exams });
});

// GET /api/exams/:id — single exam
router.get("/exams/:id", protect, async (req, res) => {
  const exam = await Exam.findById(req.params.id).populate("courseId", "title").lean();
  if (!exam) return res.status(404).json({ status: "error", message: "Exam not found" });
  res.json({ status: "success", data: exam });
});

// POST /api/exams — create exam, persisted to MongoDB
router.post("/exams", protect, restrictTo("admin", "instructor"), async (req: any, res) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id };

    // Convert comma-separated options strings to arrays for MCQ questions
    if (Array.isArray(payload.questions)) {
      payload.questions = payload.questions.map((q: any) => ({
        ...q,
        options: typeof q.options === "string"
          ? q.options.split(",").map((s: string) => s.trim()).filter(Boolean)
          : q.options,
        points: Number(q.points) || 1,
      }));
    }

    const exam = await Exam.create(payload);
    const populated = await exam.populate("courseId", "title");
    res.status(201).json({ status: "success", data: populated });
  } catch (err: any) {
    res.status(400).json({ status: "error", message: err.message });
  }
});

// POST /api/exams/:id/submit — grades exam, saves submission, returns score [7.5]
router.post("/exams/:id/submit", protect, async (req: any, res) => {
  try {
    const exam = await Exam.findById(req.params.id).lean();
    if (!exam) return res.status(404).json({ status: "error", message: "Exam not found" });

    const rawAnswers: Record<string, string> = req.body.answers ?? {};

    // Grade each question
    let score = 0;
    let totalPoints = 0;
    const breakdown = exam.questions.map((q: any) => {
      const qId = String(q._id);
      const userAnswer = (rawAnswers[qId] ?? "").trim().toLowerCase();
      const correct = (q.correctAnswer ?? "").trim().toLowerCase();
      const isCorrect = q.type === "short"
        ? userAnswer === correct  // exact match for short answer
        : userAnswer === correct;
      const pointsEarned = isCorrect ? q.points : 0;
      totalPoints += q.points;
      score += pointsEarned;
      return {
        questionId: qId,
        questionText: q.text,
        userAnswer: rawAnswers[qId] ?? "(no answer)",
        correctAnswer: q.correctAnswer,
        isCorrect,
        pointsEarned,
        pointsMax: q.points,
      };
    });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentage >= (exam.passingScore ?? 0);

    // Persist submission
    const submission = await ExamSubmission.create({
      examId: exam._id,
      examTitle: exam.examTitle,
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      answers: rawAnswers,
      score,
      totalPoints,
      percentage,
      passed,
      breakdown,
    });

    res.json({
      status: "success",
      message: passed ? "Exam passed! 🎉" : "Exam submitted. Better luck next time!",
      data: {
        submissionId: submission._id,
        examTitle: exam.examTitle,
        score,
        totalPoints,
        percentage,
        passed,
        passingScore: exam.passingScore,
        breakdown,
      },
    });
  } catch (err: any) {
    res.status(400).json({ status: "error", message: err.message });
  }
});

// GET /api/exams/:id/submissions — instructor/admin view of all student results
router.get("/exams/:id/submissions", protect, restrictTo("admin", "instructor"), async (req, res) => {
  try {
    const submissions = await ExamSubmission
      .find({ examId: req.params.id })
      .sort({ submittedAt: -1 })
      .lean();
    res.json({ status: "success", results: submissions.length, data: submissions });
  } catch (err: any) {
    res.status(400).json({ status: "error", message: err.message });
  }
});

// GET /api/submissions — all submissions across exams (admin)
router.get("/submissions", protect, restrictTo("admin", "instructor"), async (_req, res) => {
  try {
    const submissions = await ExamSubmission
      .find({})
      .sort({ submittedAt: -1 })
      .lean();
    res.json({ status: "success", results: submissions.length, data: submissions });
  } catch (err: any) {
    res.status(400).json({ status: "error", message: err.message });
  }
});

// DELETE /api/exams/:id — soft delete
router.delete("/exams/:id", protect, restrictTo("admin"), async (req, res) => {
  await Exam.findByIdAndUpdate(req.params.id, { isDeleted: true });
  res.status(204).send();
});

export default router;
