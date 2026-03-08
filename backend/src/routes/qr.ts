import { Router, Request, Response } from "express";
import { generateQRImage, generateQRPayload } from "../utils/qr";
import db from "../config/database";

const router = Router();

// GET /api/qr/generate?lecture_id=42
router.get("/generate", async (req: Request, res: Response) => {
  const { lecture_id } = req.query;
  if (!lecture_id) {
    res.status(400).json({ success: false, error: "lecture_id required" });
    return;
  }

  // Check lecture exists
  const lecture = db
    .prepare("SELECT * FROM lectures WHERE lecture_id = ?")
    .get(lecture_id as string) as any;
  if (!lecture) {
    res.status(404).json({ success: false, error: "Lecture not found — create it first" });
    return;
  }

  // Check time window
  const now = Math.floor(Date.now() / 1000);
  if (now > lecture.deadline) {
    res.status(403).json({ success: false, error: "Lecture attendance window is closed" });
    return;
  }

  try {
    const qrImage = await generateQRImage(lecture_id as string);
    const payload = generateQRPayload(lecture_id as string);
    res.json({ success: true, qr_image: qrImage, payload, expires_in: 60 });
  } catch {
    res.status(500).json({ success: false, error: "QR generation failed" });
  }
});

export default router;