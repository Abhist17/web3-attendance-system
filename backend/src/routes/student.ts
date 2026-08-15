import { Router, Request, Response } from "express";
import db from "../config/database";
import { hashFingerprint } from "../utils/device";

const router = Router();

const MAX_STUDENT_ID_LEN = 32; // must match the on-chain PDA seed limit
const MAX_NAME_LEN = 64;
const MAX_DEPT_LEN = 64;

// POST /api/student/register
router.post("/register", (req: Request, res: Response) => {
  const { wallet, student_id, name, department, device_fingerprint, solana_tx } = req.body ?? {};

  if (!wallet || !student_id || !name || !department) {
    res.status(400).json({
      success: false,
      error: "wallet, student_id, name and department are required",
    });
    return;
  }

  const limits: [string, unknown, number][] = [
    ["student_id", student_id, MAX_STUDENT_ID_LEN],
    ["name", name, MAX_NAME_LEN],
    ["department", department, MAX_DEPT_LEN],
  ];
  for (const [field, value, max] of limits) {
    if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
      res.status(400).json({
        success: false,
        error: `${field} must be a non-empty string of at most ${max} characters`,
      });
      return;
    }
  }

  if (db.prepare("SELECT id FROM students WHERE wallet = ?").get(wallet)) {
    res.status(409).json({ success: false, error: "Wallet already registered" });
    return;
  }
  if (db.prepare("SELECT id FROM students WHERE student_id = ?").get(student_id)) {
    res.status(409).json({ success: false, error: "Student ID already registered" });
    return;
  }

  db.prepare(
    `INSERT INTO students (wallet, student_id, name, department, device_fingerprint, solana_tx)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    wallet,
    student_id.trim(),
    name.trim(),
    department.trim(),
    typeof device_fingerprint === "string" && device_fingerprint
      ? hashFingerprint(device_fingerprint)
      : null,
    typeof solana_tx === "string" && solana_tx ? solana_tx : null
  );

  res.status(201).json({ success: true, message: "Student registered successfully" });
});

// GET /api/student/:wallet
router.get("/:wallet", (req: Request, res: Response) => {
  const student = db
    .prepare(
      `SELECT wallet, student_id, name, department, registered_at, solana_tx,
              device_fingerprint IS NOT NULL AS device_bound
       FROM students WHERE wallet = ?`
    )
    .get(req.params.wallet) as Record<string, unknown> | undefined;

  if (!student) {
    res.status(404).json({ success: false, error: "Student not found" });
    return;
  }

  const attendance = db
    .prepare(
      `SELECT a.lecture_id, a.timestamp, a.solana_tx, a.distance_meters, l.subject
       FROM attendance a
       LEFT JOIN lectures l ON a.lecture_id = l.lecture_id
       WHERE a.student_wallet = ?
       ORDER BY a.timestamp DESC`
    )
    .all(req.params.wallet);

  res.json({
    success: true,
    student: { ...student, device_bound: Boolean(student.device_bound) },
    attendance,
  });
});

export default router;
