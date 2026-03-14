import { Router, type IRouter } from "express";

const router: IRouter = Router();

// [3.2] Interactive Real-time Health Monitoring API
// Shows process.uptime() and process.memoryUsage() converted to MB
router.get("/health", (_req, res) => {
  const mem = process.memoryUsage();
  const toMB = (bytes: number) => parseFloat((bytes / 1024 / 1024).toFixed(2));

  res.json({
    status: "ok",
    uptime: parseFloat(process.uptime().toFixed(2)),
    uptimeUnit: "seconds",
    timestamp: new Date().toISOString(),
    memory: {
      rss: toMB(mem.rss),
      heapTotal: toMB(mem.heapTotal),
      heapUsed: toMB(mem.heapUsed),
      external: toMB(mem.external),
    },
    memoryUnit: "MB",
  });
});

// Keep original healthz endpoint
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
