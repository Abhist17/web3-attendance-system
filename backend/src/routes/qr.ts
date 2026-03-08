import { Router, Request, Response } from "express";
import { generateQRImage, generateQRPayload } from "../utils/qr";
import { setLectureLocation } from "../middleware/validateAttendance";

const router = Router();

router.get("/generate", async (req: Request, res: Response) => {
  const { lecture_id } = req.query;
  if (!lecture_id) {
    res.status(400).json({ success: false, error: "lecture_id required" });
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

router.post("/set-location", (req: Request, res: Response) => {
  const { lecture_id, lat, lng } = req.body;
  if (!lecture_id || lat === undefined || lng === undefined) {
    res.status(400).json({ success: false, error: "Missing fields" });
    return;
  }
  setLectureLocation(lecture_id, { lat: parseFloat(lat), lng: parseFloat(lng) });
  res.json({ success: true, message: "Location set for lecture " + lecture_id });
});

export default router;