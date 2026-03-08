import { Router, Request, Response } from "express";
import { validateAttendanceRequest } from "../middleware/validateAttendance";
import db from "../config/database";

const router = Router();

// POST /api/attendance/mark
router.post("/mark", validateAttendanceRequest, (req: Request, res: Response) => {
  const { lecture_id, student_wallet, device_fingerprint, student_lat, student_lng, solana_tx } = req.body;

  db.prepare(
    "INSERT INTO attendance (student_wallet, lecture_id, timestamp, device_fingerprint, student_lat, student_lng, solana_tx) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    student_wallet, lecture_id,
    Math.floor(Date.now() / 1000),
    device_fingerprint || null,
    student_lat, student_lng,
    solana_tx || null
  );

  res.json({
    success: true,
    message: "Attendance verified and recorded",
    anti_proxy_checks: {
      qr_verified: true,
      time_window: true,
      geolocation: true,
      device_check: true,
      duplicate_blocked: true,
      wallet_verified: true,
    },
  });
});

// GET /api/attendance/list?lecture_id=42
router.get("/list", (req: Request, res: Response) => {
  const { lecture_id } = req.query;
  const records = lecture_id
    ? db.prepare(
        "SELECT a.*, s.name, s.student_id FROM attendance a LEFT JOIN students s ON a.student_wallet = s.wallet WHERE a.lecture_id = ? ORDER BY a.timestamp DESC"
      ).all(lecture_id)
    : db.prepare(
        "SELECT a.*, s.name, s.student_id FROM attendance a LEFT JOIN students s ON a.student_wallet = s.wallet ORDER BY a.timestamp DESC"
      ).all();

  res.json({ success: true, count: (records as any[]).length, records });
});

export default router;