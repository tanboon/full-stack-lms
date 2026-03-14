import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import coursesRouter from "./courses.js";
import streamRouter from "./stream.js";
import gatewayRouter from "./gateway.js";

const router: IRouter = Router();

router.use(healthRouter);   // [3.2] /health, /healthz
router.use(authRouter);     // [5.1–5.5] /auth/register, /auth/login, /auth/logout
router.use(coursesRouter);  // [4.1–4.5] /courses
router.use(streamRouter);   // [3.4] /stream/:filename
router.use(gatewayRouter);  // [3.5] /gateway/users

export default router;
