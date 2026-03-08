import { Router, Request, Response } from "express";
import db from "../config/database";
import { hashFingerprint } from "../utils/device";

const router = Router();

// POST /api/student/register
router.post("/register", (req: Request, res: Response) => {
  const { wallet, student_id, name, department, device_fingerprint } = req.body;

  if (!wallet || !student_id || !name || !department) {
    res.status(400).json({ success: false, error: "Missing fields" });
    return;
  }

  const existingWallet = db
    .prepare("SELECT id FROM students WHERE wallet = ?")
    .get(wallet);
  if (existingWallet) {
    res.status(409).json({ success: false, error: "Wallet already registered" });
    return;
  }

  const existingId = db
    .prepare("SELECT id FROM students WHERE student_id = ?")
    .get(student_id);
  if (existingId) {
    res.status(409).json({ success: false, error: "Student ID already registered" });
    return;
  }

  const fingerprint = device_fingerprint
    ? hashFingerprint(device_fingerprint)
    : null;

  db.prepare(
    "INSERT INTO students (wallet, student_id, name, department, device_fingerprint) VALUES (?, ?, ?, ?, ?)"
  ).run(wallet, student_id, name, department, fingerprint);

  res.json({ success: true, message: "Student registered successfully" });
});

// GET /api/student/:wallet
router.get("/:wallet", (req: Request, res: Response) => {
  const student = db
    .prepare("SELECT wallet, student_id, name, department, registered_at FROM students WHERE wallet = ?")
    .get(req.params.wallet) as any;

  if (!student) {
    res.status(404).json({ success: false, error: "Student not found" });
    return;
  }

  const records = db
    .prepare("SELECT lecture_id, timestamp, solana_tx FROM attendance WHERE student_wallet = ? ORDER BY timestamp DESC")
    .all(req.params.wallet);

  res.json({ success: true, student, attendance: records });
});

export default router;