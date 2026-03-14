import { Router } from "express";
import { protect } from "../middlewares/protect.js";
import { restrictTo } from "../middlewares/restrictTo.js";

const router = Router();

// [6.5] Dynamic Form Engine — the JSON schema that drives the exam creation UI
// The frontend renders fields dynamically based on this schema
router.get("/exam/schema", protect, (_req, res) => {
  const schema = {
    title: "Exam Creation Schema",
    fields: [
      {
        key: "examTitle",
        label: "Exam Title",
        type: "text",
        required: true,
        validation: { minLength: 5 },
      },
      {
        key: "courseId",
        label: "Linked Course",
        type: "select",
        required: true,
        options: [], // populated dynamically from courses
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
      },
      {
        key: "adminPasscode",
        label: "Admin Passcode",
        type: "text",
        required: false,
        // [6.5] Conditional: only show if role === "admin"
        conditionalOn: { field: "role", value: "admin" },
        validation: { minLength: 4 },
      },
      {
        key: "duration",
        label: "Duration (minutes)",
        type: "number",
        required: true,
        validation: { min: 5, max: 180 },
      },
      {
        key: "passingScore",
        label: "Passing Score (%)",
        type: "number",
        required: true,
        validation: { min: 0, max: 100 },
      },
      {
        key: "shuffleQuestions",
        label: "Shuffle Questions",
        type: "boolean",
        required: false,
      },
      {
        key: "instructions",
        label: "Instructions",
        type: "textarea",
        required: false,
        // [6.5] Nested object
        nestedFields: [
          { key: "en", label: "English Instructions", type: "textarea" },
          { key: "ar", label: "Arabic Instructions", type: "textarea" },
        ],
      },
      {
        key: "questions",
        label: "Questions",
        type: "array",
        required: true,
        // [6.5] Nested object schema for each question
        itemSchema: {
          fields: [
            { key: "text", label: "Question Text", type: "text", required: true },
            {
              key: "type",
              label: "Question Type",
              type: "select",
              required: true,
              options: [
                { value: "mcq", label: "Multiple Choice" },
                { value: "truefalse", label: "True/False" },
                { value: "short", label: "Short Answer" },
              ],
            },
            {
              key: "options",
              label: "Answer Options",
              type: "array",
              // [6.5] Conditional: only show if type === "mcq"
              conditionalOn: { field: "type", value: "mcq" },
              itemSchema: { fields: [{ key: "text", label: "Option Text", type: "text" }] },
            },
            { key: "correctAnswer", label: "Correct Answer", type: "text", required: true },
            { key: "points", label: "Points", type: "number", required: true },
          ],
        },
      },
    ],
  };

  res.json({ status: "success", schema });
});

// POST /api/exams — create exam from dynamic form data
router.post("/exams", protect, restrictTo("admin", "instructor"), async (req, res) => {
  try {
    // In a full implementation, save to a Mongoose Exam model
    // For now, echo back the validated exam data
    res.status(201).json({
      status: "success",
      message: "Exam created successfully.",
      data: req.body,
    });
  } catch (err: any) {
    res.status(400).json({ status: "error", message: err.message });
  }
});

export default router;
