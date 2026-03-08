import { Router, Request, Response } from "express";
import { validateAttendanceRequest } from "../middleware/validateAttendance";

const router = Router();

const attendanceLogs: Array<{
  student_wallet: string;
  lecture_id: string;
  timestamp: number;
  verified: boolean;
}> = [];

router.post("/mark", validateAttendanceRequest, (req: Request, res: Response) => {
  const { lecture_id, student_wallet } = req.body;

  if (!student_wallet) {
    res.status(400).json({ success: false, error: "student_wallet required" });
    return;
  }

  const duplicate = attendanceLogs.find(
    (a) => a.student_wallet === student_wallet && a.lecture_id === lecture_id
  );
  if (duplicate) {
    res.status(409).json({ success: false, error: "Attendance already marked" });
    return;
  }

  const record = { student_wallet, lecture_id, timestamp: Date.now(), verified: true };
  attendanceLogs.push(record);

  res.json({
    success: true,
    message: "Attendance verified — ready to submit to Solana",
    record,
  });
});

router.get("/list", (req: Request, res: Response) => {
  const { lecture_id } = req.query;
  const results = lecture_id
    ? attendanceLogs.filter((a) => a.lecture_id === lecture_id)
    : attendanceLogs;
  res.json({ success: true, count: results.length, records: results });
});

export default router;