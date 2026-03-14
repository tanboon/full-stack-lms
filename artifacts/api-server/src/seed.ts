import mongoose from "mongoose";
import User from "./models/User.js";
import Course from "./models/Course.js";
import { Exam } from "./models/Exam.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/lms-db";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // ── Users ─────────────────────────────────────────────────────────────────
  await User.deleteMany({});
  const [adminUser, instructorUser] = await User.create([
    { name: "Admin User", email: "admin@lms.com", password: "securepass123", role: "admin" },
    { name: "Dr. Sarah Chen", email: "instructor@lms.com", password: "securepass123", role: "instructor" },
    { name: "Alex Johnson", email: "student1@lms.com", password: "securepass123", role: "student" },
    { name: "Maria Garcia", email: "student2@lms.com", password: "securepass123", role: "student" },
  ]);
  console.log("Users seeded: 4");

  // ── Courses ───────────────────────────────────────────────────────────────
  await Course.deleteMany({});
  const courses = await Course.create([
    {
      title: "Full-Stack Web Development with Node.js and React",
      description: "Learn to build scalable web applications from scratch using Express, MongoDB, and React. Covers REST API design, authentication, and deployment best practices.",
      instructor: instructorUser._id,
      price: 4999,
      discount: 20,
      category: "web-dev",
      tags: ["nodejs", "react", "mongodb", "express"],
      level: "intermediate",
      seats: 50,
      enrolledCount: 156,
    },
    {
      title: "Database Systems: SQL and NoSQL Mastery",
      description: "Deep dive into relational and document databases. Covers PostgreSQL, MongoDB aggregation pipelines, indexing strategies, and performance optimization techniques.",
      instructor: instructorUser._id,
      price: 3999,
      discount: 0,
      category: "data-science",
      tags: ["mongodb", "postgresql", "databases", "nosql"],
      level: "advanced",
      seats: 30,
      enrolledCount: 89,
    },
    {
      title: "React Native Mobile App Development with Expo",
      description: "Build cross-platform mobile apps with React Native and Expo. Covers navigation, state management, AsyncStorage, NetInfo, and publishing to app stores.",
      instructor: instructorUser._id,
      price: 5999,
      discount: 10,
      category: "mobile-dev",
      tags: ["react native", "expo", "mobile", "javascript"],
      level: "intermediate",
      seats: 40,
      enrolledCount: 203,
    },
    {
      title: "Data Structures and Algorithms Fundamentals",
      description: "Master fundamental data structures and algorithmic thinking. Essential preparation for technical interviews at top technology companies worldwide.",
      instructor: instructorUser._id,
      price: 2999,
      discount: 15,
      category: "other",
      tags: ["algorithms", "data structures", "computer science"],
      level: "beginner",
      seats: 100,
      enrolledCount: 412,
    },
    {
      title: "Machine Learning with Python and PyTorch",
      description: "Practical machine learning course covering supervised learning, neural networks, scikit-learn, and PyTorch with real-world datasets and projects.",
      instructor: instructorUser._id,
      price: 6999,
      discount: 5,
      category: "data-science",
      tags: ["machine learning", "python", "ai", "data science"],
      level: "advanced",
      seats: 25,
      enrolledCount: 178,
    },
  ]);
  console.log("Courses seeded:", courses.length);

  // ── Exams ─────────────────────────────────────────────────────────────────
  await Exam.deleteMany({});
  await Exam.create([
    {
      examTitle: "Midterm: Database Systems",
      courseId: courses[1]._id,
      role: "student",
      duration: 90,
      passingScore: 70,
      shuffleQuestions: true,
      instructions: {
        en: "Answer all questions. You have 90 minutes. No external resources allowed.",
        ar: "أجب على جميع الأسئلة. لديك 90 دقيقة. لا يسمح باستخدام موارد خارجية.",
      },
      questions: [
        {
          text: "Which of the following best describes the CAP theorem?",
          type: "mcq",
          options: [
            "Consistency, Availability, Partition Tolerance",
            "Concurrency, Atomicity, Persistence",
            "Caching, Availability, Performance",
            "Consistency, Atomicity, Partitioning",
          ],
          correctAnswer: "Consistency, Availability, Partition Tolerance",
          points: 10,
        },
        {
          text: "What does ACID stand for in database transactions?",
          type: "mcq",
          options: [
            "Atomicity, Consistency, Isolation, Durability",
            "Availability, Consistency, Integrity, Distribution",
            "Atomicity, Caching, Isolation, Distribution",
            "Authentication, Consistency, Isolation, Durability",
          ],
          correctAnswer: "Atomicity, Consistency, Isolation, Durability",
          points: 10,
        },
        {
          text: "MongoDB uses a document-oriented storage model.",
          type: "truefalse",
          correctAnswer: "True",
          points: 5,
        },
        {
          text: "Explain the difference between SQL and NoSQL databases in production systems.",
          type: "short",
          correctAnswer: "SQL is relational with fixed schema; NoSQL is flexible and schema-less.",
          points: 15,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      examTitle: "Final Exam: Full-Stack Development",
      courseId: courses[0]._id,
      role: "student",
      duration: 120,
      passingScore: 65,
      shuffleQuestions: false,
      instructions: {
        en: "Complete all sections. Practical coding questions are in the second half.",
      },
      questions: [
        {
          text: "What HTTP status code is returned for a successful POST that creates a resource?",
          type: "mcq",
          options: ["200 OK", "201 Created", "204 No Content", "302 Found"],
          correctAnswer: "201 Created",
          points: 10,
        },
        {
          text: "JWT tokens are stored server-side by default.",
          type: "truefalse",
          correctAnswer: "False",
          points: 5,
        },
        {
          text: "Explain what middleware is in the context of Express.js applications.",
          type: "short",
          correctAnswer: "Functions that execute between request and response in the request lifecycle.",
          points: 15,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      examTitle: "Quiz: React Native Fundamentals",
      courseId: courses[2]._id,
      role: "student",
      duration: 45,
      passingScore: 60,
      shuffleQuestions: true,
      questions: [
        {
          text: "Which API is used to persist data locally in Expo without a server?",
          type: "mcq",
          options: ["useStorage", "AsyncStorage", "useLocalStorage", "SecureStore"],
          correctAnswer: "AsyncStorage",
          points: 10,
        },
        {
          text: "Expo Router uses file-based routing similar to Next.js.",
          type: "truefalse",
          correctAnswer: "True",
          points: 5,
        },
      ],
      createdBy: adminUser._id,
    },
  ]);
  console.log("Exams seeded: 3");

  await mongoose.disconnect();
  console.log("Seeding complete!");
}

seed().catch(err => { console.error(err); process.exit(1); });
