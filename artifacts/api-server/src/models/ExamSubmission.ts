import mongoose, { Document, Schema } from "mongoose";

export interface IBreakdown {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  pointsMax: number;
}

export interface IExamSubmission extends Document {
  examId: mongoose.Types.ObjectId;
  examTitle: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  answers: Map<string, string>;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  breakdown: IBreakdown[];
  submittedAt: Date;
}

const BreakdownSchema = new Schema<IBreakdown>({
  questionId: String,
  questionText: String,
  userAnswer: String,
  correctAnswer: String,
  isCorrect: Boolean,
  pointsEarned: Number,
  pointsMax: Number,
}, { _id: false });

const ExamSubmissionSchema = new Schema<IExamSubmission>({
  examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
  examTitle: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  answers: { type: Map, of: String, default: {} },
  score: { type: Number, required: true },
  totalPoints: { type: Number, required: true },
  percentage: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  breakdown: [BreakdownSchema],
  submittedAt: { type: Date, default: Date.now },
});

export const ExamSubmission = mongoose.model<IExamSubmission>("ExamSubmission", ExamSubmissionSchema);
