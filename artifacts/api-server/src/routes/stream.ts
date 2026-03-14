import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

const router = Router();

const REQUIRED_USER_AGENT = "LMS-VideoPlayer/1.0";
const MAX_RAM_MB = 20; // [3.4] RAM guard

// [3.4] Secure File Vault Streamer
router.get("/stream/:filename", (req: Request, res: Response) => {
  // [3.4] Require specific User-Agent header
  const userAgent = req.headers["user-agent"] ?? "";
  if (!userAgent.includes(REQUIRED_USER_AGENT)) {
    res.status(403).json({
      status: "error",
      message: `Forbidden. Required User-Agent: ${REQUIRED_USER_AGENT}`,
    });
    return;
  }

  // [3.4] RAM guard — heapUsed must not exceed 20MB
  const memoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
  if (memoryMB > MAX_RAM_MB) {
    res.status(503).json({
      status: "error",
      message: `Memory usage too high (${memoryMB.toFixed(2)} MB). Max allowed: ${MAX_RAM_MB} MB.`,
    });
    return;
  }

  // Sanitize filename to prevent path traversal
  const filename = path.basename(req.params.filename);
  const filePath = path.resolve("uploads", filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ status: "error", message: "File not found." });
    return;
  }

  const stat = fs.statSync(filePath);
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Length", stat.size);
  res.setHeader("Accept-Ranges", "bytes");

  // [3.4] MUST use fs.createReadStream().pipe(res) — never loads entire file into RAM
  const fileStream = fs.createReadStream(filePath);
  fileStream.on("error", () => {
    if (!res.headersSent) {
      res.status(500).json({ status: "error", message: "Stream error." });
    }
  });
  fileStream.pipe(res);
});

export default router;
