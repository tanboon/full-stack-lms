import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import coursesRouter from "./courses.js";
import usersRouter from "./users.js";
import streamRouter from "./stream.js";
import gatewayRouter from "./gateway.js";
import examRouter from "./exam.js";

const router: IRouter = Router();

router.use(healthRouter);   // [3.2] /health, /healthz
router.use(authRouter);     // [5.1–5.5] /auth/register, /auth/login, /auth/logout, /auth/me
router.use(coursesRouter);  // [4.1–4.5] /courses CRUD + enroll + reviews + stats
router.use(usersRouter);    // [4.2] /users CRUD with soft delete
router.use(examRouter);     // [6.5] /exam/schema, /exams
router.use(streamRouter);   // [3.4] /stream/:filename
router.use(gatewayRouter);  // [3.5] /gateway/users

export default router;
