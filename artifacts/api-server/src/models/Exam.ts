import mongoose, { Document, Schema } from "mongoose";

export interface IQuestion {
  text: string;
  type: "mcq" | "truefalse" | "short";
  options?: string[];
  correctAnswer: string;
  points: number;
}

export interface IExam extends Document {
  examTitle: string;
  courseId: mongoose.Types.ObjectId;
  role: "student" | "admin";
  adminPasscode?: string;
  duration: number;
  passingScore: number;
  shuffleQuestions: boolean;
  instructions?: { en?: string; ar?: string };
  questions: IQuestion[];
  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  text: { type: String, required: true },
  type: { type: String, enum: ["mcq", "truefalse", "short"], required: true },
  options: [String],
  correctAnswer: { type: String, required: true },
  points: { type: Number, required: true, min: 1 },
});

const ExamSchema = new Schema<IExam>(
  {
    examTitle: { type: String, required: true, minlength: 5 },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    role: { type: String, enum: ["student", "admin"], required: true },
    adminPasscode: { type: String },
    duration: { type: Number, required: true, min: 5, max: 180 },
    passingScore: { type: Number, required: true, min: 0, max: 100 },
    shuffleQuestions: { type: Boolean, default: false },
    instructions: {
      en: String,
      ar: String,
    },
    questions: { type: [QuestionSchema], required: true, validate: [(v: any[]) => v.length > 0, "At least one question required"] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ExamSchema.pre(/^find/, function (this: any) {
  this.where({ isDeleted: { $ne: true } });
});

export const Exam = mongoose.model<IExam>("Exam", ExamSchema);
