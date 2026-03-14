import mongoose, { Document, Schema } from "mongoose";

interface IReview {
  user: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
}

interface ILesson {
  title: string;
  duration: number; // minutes
  type: "video" | "reading" | "quiz";
}

interface ICurriculumSection {
  title: string;
  lessons: ILesson[];
}

export interface ICourse extends Document {
  title: string;
  description: string;
  price: number;
  discount: number;
  salePrice: number; // virtual [4.5]
  category: string;
  tags: string[];     // [4.4] used with $all
  level: "beginner" | "intermediate" | "advanced";
  instructor: mongoose.Types.ObjectId;
  seats: number;
  enrolledCount: number;
  reviews: IReview[];
  averageRating: number;
  isDeleted: boolean;  // [4.2]
  deletedAt: Date | null; // [4.2]
  videoUrl: string;
  duration: number;   // total hours
  objectives: string[];
  curriculum: ICurriculumSection[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const courseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [20, "Description must be at least 20 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    // [4.5] discount for salePrice virtual
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100%"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["web-dev", "mobile-dev", "data-science", "design", "business", "other"],
        message: "Invalid category: {VALUE}",
      },
    },
    // [4.4] Tags array — queried with MongoDB $all
    tags: { type: [String], default: [] },
    level: {
      type: String,
      required: [true, "Level is required"],
      enum: {
        values: ["beginner", "intermediate", "advanced"],
        message: "Level must be beginner, intermediate, or advanced",
      },
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Instructor is required"],
    },
    seats: {
      type: Number,
      default: 30,
      min: [1, "Must have at least 1 seat"],
    },
    enrolledCount: { type: Number, default: 0 },
    reviews: [reviewSchema],
    averageRating: { type: Number, default: 0 },
    // [4.2] Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    videoUrl: { type: String, default: "" },
    duration: { type: Number, default: 0 },
    objectives: { type: [String], default: [] },
    curriculum: {
      type: [
        {
          title: { type: String, required: true },
          lessons: {
            type: [
              {
                title: { type: String, required: true },
                duration: { type: Number, default: 0 },
                type: { type: String, enum: ["video", "reading", "quiz"], default: "video" },
              },
            ],
            default: [],
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// [4.5] Mongoose Virtual for salePrice
courseSchema.virtual("salePrice").get(function (this: ICourse) {
  return parseFloat((this.price * (1 - this.discount / 100)).toFixed(2));
});

// [4.2] Automatically exclude soft-deleted courses from standard find queries
courseSchema.pre(/^find/, function (this: mongoose.Query<unknown, unknown>) {
  this.where({ isDeleted: { $ne: true } });
});

const Course = mongoose.model<ICourse>("Course", courseSchema);
export default Course;
