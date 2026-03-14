import express, { type Express } from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import { circuitBreaker } from "./middlewares/circuitBreaker.js";

const app: Express = express();

// [3.1] CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);

// [3.1] Morgan HTTP logger
app.use(morgan("dev"));

// [3.1] Parse JSON body and URL-encoded form data with query parameters
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser — needed for HttpOnly JWT cookies [5.2]
app.use(cookieParser());

// [3.3] Circuit Breaker middleware — applied globally
app.use(circuitBreaker);

// Mount all API routes
app.use("/api", router);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

export default app;
