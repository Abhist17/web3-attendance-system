import { Router, Request, Response, NextFunction } from "express";
import { renderQRImage, generateQRPayload } from "../utils/qr";
import { env } from "../config/env";
import db from "../config/database";

const router = Router();

// GET /api/qr/generate?lecture_id=CS101
router.get("/generate", async (req: Request, res: Response, next: NextFunction) => {
  const { lecture_id } = req.query;
  if (typeof lecture_id !== "string" || !lecture_id) {
    res.status(400).json({ success: false, error: "lecture_id is required" });
    return;
  }

  const lecture = db
    .prepare("SELECT lecture_id, subject, start_time, deadline FROM lectures WHERE lecture_id = ?")
    .get(lecture_id) as { start_time: number; deadline: number } | undefined;

  if (!lecture) {
    res.status(404).json({ success: false, error: "Lecture not found — create it first" });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > lecture.deadline) {
    res.status(403).json({ success: false, error: "Attendance window is closed" });
    return;
  }

  try {
    // One payload, rendered once — the image and the JSON must carry the same
    // nonce or the code shown on screen cannot be redeemed.
    const payload = generateQRPayload(lecture_id);
    const qrImage = await renderQRImage(payload);
    res.json({
      success: true,
      qr_image: qrImage,
      payload,
      expires_in: env.qrExpirySeconds,
      window_closes_at: lecture.deadline,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
