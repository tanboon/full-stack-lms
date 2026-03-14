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
      duration: 38,
      videoUrl: "https://www.youtube.com/watch?v=7CqJlxBYj-M",
      objectives: [
        "Build a complete REST API with Express.js and MongoDB",
        "Create a React frontend with hooks and context",
        "Implement JWT authentication and authorization",
        "Deploy applications to production with best practices",
        "Write clean, maintainable code with TypeScript",
      ],
      curriculum: [
        {
          title: "Getting Started with Node.js",
          lessons: [
            { title: "Course Introduction & Setup", duration: 12, type: "video" },
            { title: "Node.js Fundamentals", duration: 28, type: "video" },
            { title: "npm & Package Management", duration: 15, type: "video" },
            { title: "Environment Setup Quiz", duration: 10, type: "quiz" },
          ],
        },
        {
          title: "Building REST APIs with Express",
          lessons: [
            { title: "Express.js Basics & Routing", duration: 35, type: "video" },
            { title: "Middleware & Error Handling", duration: 30, type: "video" },
            { title: "MongoDB & Mongoose Integration", duration: 40, type: "video" },
            { title: "REST API Best Practices", duration: 20, type: "reading" },
          ],
        },
        {
          title: "React Frontend Development",
          lessons: [
            { title: "React Hooks Deep Dive", duration: 45, type: "video" },
            { title: "State Management with Context", duration: 30, type: "video" },
            { title: "Connecting Frontend to API", duration: 35, type: "video" },
            { title: "React Patterns Quiz", duration: 15, type: "quiz" },
          ],
        },
        {
          title: "Authentication & Deployment",
          lessons: [
            { title: "JWT Authentication Implementation", duration: 40, type: "video" },
            { title: "Security Best Practices", duration: 20, type: "reading" },
            { title: "Deploying to Production", duration: 35, type: "video" },
            { title: "Final Project Review", duration: 25, type: "video" },
          ],
        },
      ],
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
      duration: 28,
      videoUrl: "",
      objectives: [
        "Master MongoDB aggregation pipelines and operators",
        "Design efficient relational schemas with PostgreSQL",
        "Implement indexing strategies for performance optimization",
        "Understand the CAP theorem and distributed database concepts",
        "Write complex queries with JOINs and subqueries",
      ],
      curriculum: [
        {
          title: "Relational Database Fundamentals",
          lessons: [
            { title: "Introduction to Database Systems", duration: 20, type: "video" },
            { title: "SQL Queries & JOINs", duration: 45, type: "video" },
            { title: "Schema Design Principles", duration: 30, type: "video" },
            { title: "SQL Fundamentals Quiz", duration: 15, type: "quiz" },
          ],
        },
        {
          title: "PostgreSQL Advanced",
          lessons: [
            { title: "Indexes & Query Optimization", duration: 40, type: "video" },
            { title: "Transactions & ACID Properties", duration: 35, type: "video" },
            { title: "PostgreSQL Performance Tuning", duration: 25, type: "reading" },
          ],
        },
        {
          title: "MongoDB & NoSQL",
          lessons: [
            { title: "Document Model vs Relational", duration: 25, type: "video" },
            { title: "Aggregation Pipeline Mastery", duration: 50, type: "video" },
            { title: "MongoDB Indexing Strategies", duration: 35, type: "video" },
            { title: "NoSQL Design Patterns", duration: 20, type: "reading" },
            { title: "Database Mastery Final Quiz", duration: 20, type: "quiz" },
          ],
        },
      ],
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
      duration: 42,
      videoUrl: "https://www.youtube.com/watch?v=0-S5a0eXPoc",
      objectives: [
        "Build cross-platform iOS and Android apps from one codebase",
        "Implement file-based routing with Expo Router",
        "Manage app state with AsyncStorage and Context API",
        "Handle offline scenarios with NetInfo",
        "Publish apps to the App Store and Google Play",
      ],
      curriculum: [
        {
          title: "React Native & Expo Basics",
          lessons: [
            { title: "Introduction to React Native", duration: 20, type: "video" },
            { title: "Setting Up Your Expo Environment", duration: 25, type: "video" },
            { title: "Core Components: View, Text, Image", duration: 30, type: "video" },
            { title: "Styling with StyleSheet", duration: 20, type: "video" },
          ],
        },
        {
          title: "Navigation & Routing",
          lessons: [
            { title: "Expo Router File-Based Routing", duration: 35, type: "video" },
            { title: "Tab & Stack Navigation", duration: 40, type: "video" },
            { title: "Deep Linking & Dynamic Routes", duration: 30, type: "video" },
            { title: "Navigation Patterns Quiz", duration: 10, type: "quiz" },
          ],
        },
        {
          title: "State & Data Management",
          lessons: [
            { title: "React Hooks in Mobile Context", duration: 35, type: "video" },
            { title: "AsyncStorage for Persistence", duration: 25, type: "video" },
            { title: "Context API & State Patterns", duration: 30, type: "video" },
            { title: "NetInfo & Offline Handling", duration: 20, type: "video" },
          ],
        },
        {
          title: "Publishing & Best Practices",
          lessons: [
            { title: "App Permissions & Native APIs", duration: 25, type: "video" },
            { title: "Performance Optimization", duration: 20, type: "reading" },
            { title: "Building & Publishing to Stores", duration: 35, type: "video" },
            { title: "Mobile Dev Final Quiz", duration: 15, type: "quiz" },
          ],
        },
      ],
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
      duration: 24,
      videoUrl: "",
      objectives: [
        "Understand Big O notation and time/space complexity",
        "Implement arrays, linked lists, stacks, and queues",
        "Master tree and graph traversal algorithms",
        "Solve dynamic programming problems with confidence",
        "Prepare effectively for technical coding interviews",
      ],
      curriculum: [
        {
          title: "Foundations & Complexity",
          lessons: [
            { title: "Why Data Structures Matter", duration: 15, type: "video" },
            { title: "Big O Notation Explained", duration: 30, type: "video" },
            { title: "Arrays & Memory Layout", duration: 25, type: "video" },
            { title: "Complexity Analysis Quiz", duration: 10, type: "quiz" },
          ],
        },
        {
          title: "Linear Data Structures",
          lessons: [
            { title: "Linked Lists: Single & Double", duration: 35, type: "video" },
            { title: "Stacks & Queues", duration: 30, type: "video" },
            { title: "Hash Maps & Collision Handling", duration: 40, type: "video" },
            { title: "Linear Structures Practice", duration: 15, type: "reading" },
          ],
        },
        {
          title: "Trees & Graphs",
          lessons: [
            { title: "Binary Trees & BST", duration: 40, type: "video" },
            { title: "BFS & DFS Traversals", duration: 35, type: "video" },
            { title: "Graph Algorithms", duration: 45, type: "video" },
            { title: "Trees & Graphs Quiz", duration: 15, type: "quiz" },
          ],
        },
        {
          title: "Sorting & Dynamic Programming",
          lessons: [
            { title: "Sorting Algorithms Compared", duration: 35, type: "video" },
            { title: "Intro to Dynamic Programming", duration: 40, type: "video" },
            { title: "Interview Problem Walkthrough", duration: 30, type: "video" },
          ],
        },
      ],
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
      duration: 52,
      videoUrl: "",
      objectives: [
        "Implement supervised and unsupervised ML algorithms from scratch",
        "Use scikit-learn for model training and evaluation",
        "Build neural networks with PyTorch",
        "Apply feature engineering and data preprocessing techniques",
        "Deploy machine learning models to production APIs",
      ],
      curriculum: [
        {
          title: "Python for Machine Learning",
          lessons: [
            { title: "Python & NumPy Refresher", duration: 30, type: "video" },
            { title: "Pandas for Data Analysis", duration: 40, type: "video" },
            { title: "Data Visualization with Matplotlib", duration: 30, type: "video" },
            { title: "Data Preprocessing Lab", duration: 20, type: "reading" },
          ],
        },
        {
          title: "Classical Machine Learning",
          lessons: [
            { title: "Linear & Logistic Regression", duration: 45, type: "video" },
            { title: "Decision Trees & Random Forests", duration: 40, type: "video" },
            { title: "Model Evaluation & Cross-Validation", duration: 35, type: "video" },
            { title: "Scikit-Learn Workflow Quiz", duration: 15, type: "quiz" },
          ],
        },
        {
          title: "Deep Learning with PyTorch",
          lessons: [
            { title: "Neural Network Fundamentals", duration: 50, type: "video" },
            { title: "Building Models in PyTorch", duration: 55, type: "video" },
            { title: "Convolutional Neural Networks", duration: 50, type: "video" },
            { title: "Training & Optimization Tricks", duration: 35, type: "video" },
            { title: "Deep Learning Quiz", duration: 20, type: "quiz" },
          ],
        },
        {
          title: "Real-World ML Projects",
          lessons: [
            { title: "End-to-End ML Pipeline", duration: 60, type: "video" },
            { title: "Deploying Models as APIs", duration: 40, type: "video" },
            { title: "Capstone Project Guide", duration: 20, type: "reading" },
          ],
        },
      ],
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
