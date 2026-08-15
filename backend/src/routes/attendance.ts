import { Router, Request, Response } from "express";
import { validateAttendanceRequest } from "../middleware/validateAttendance";
import db from "../config/database";

const router = Router();

const insertAttendance = db.prepare(
  `INSERT INTO attendance
     (student_wallet, lecture_id, timestamp, device_fingerprint,
      student_lat, student_lng, distance_meters, solana_tx)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

const consumeNonce = db.prepare(
  "INSERT INTO used_nonces (nonce, student_wallet, used_at) VALUES (?, ?, ?)"
);

/**
 * Burns the nonce and writes the record together. Either both land or neither
 * does, so a crash between the two cannot leave a student unable to retry.
 */
const commitAttendance = db.transaction(
  (args: {
    nonce: string;
    wallet: string;
    lectureId: string;
    now: number;
    fingerprint: string | null;
    lat: number;
    lng: number;
    distance: number | null;
    solanaTx: string | null;
  }) => {
    consumeNonce.run(args.nonce, args.wallet, args.now);
    insertAttendance.run(
      args.wallet,
      args.lectureId,
      args.now,
      args.fingerprint,
      args.lat,
      args.lng,
      args.distance,
      args.solanaTx
    );
  }
);

// POST /api/attendance/mark
router.post("/mark", validateAttendanceRequest, (req: Request, res: Response) => {
  const validated = req.attendance!;
  const { device_fingerprint, solana_tx } = req.body;
  const now = Math.floor(Date.now() / 1000);

  try {
    commitAttendance({
      nonce: validated.payload.nonce,
      wallet: validated.student.wallet,
      lectureId: validated.lecture.lecture_id,
      now,
      fingerprint: typeof device_fingerprint === "string" ? device_fingerprint : null,
      lat: validated.lat,
      lng: validated.lng,
      distance: validated.distance,
      solanaTx: typeof solana_tx === "string" && solana_tx ? solana_tx : null,
    });
  } catch (err: any) {
    // Two requests racing past the middleware's duplicate check both reach the
    // unique constraint; only one wins.
    if (String(err?.code).includes("SQLITE_CONSTRAINT")) {
      res.status(409).json({ success: false, error: "Attendance already marked for this lecture" });
      return;
    }
    throw err;
  }

  res.json({
    success: true,
    message: "Attendance verified and recorded",
    record: {
      lecture_id: validated.lecture.lecture_id,
      subject: validated.lecture.subject,
      student: validated.student.name,
      timestamp: now,
      distance_meters: validated.distance,
      solana_tx: typeof solana_tx === "string" ? solana_tx : null,
    },
    checks: {
      qr_signature: true,
      qr_freshness: true,
      nonce_replay: true,
      time_window: true,
      geolocation: validated.distance !== null,
      device_binding: validated.student.device_fingerprint !== null,
      duplicate_blocked: true,
      wallet_registered: true,
    },
  });
});

// GET /api/attendance/list?lecture_id=CS101
router.get("/list", (req: Request, res: Response) => {
  const { lecture_id } = req.query;

  const base = `SELECT a.id, a.student_wallet, a.lecture_id, a.timestamp,
                       a.student_lat, a.student_lng, a.distance_meters, a.solana_tx,
                       s.name, s.student_id, s.department
                FROM attendance a
                LEFT JOIN students s ON a.student_wallet = s.wallet`;

  const records =
    typeof lecture_id === "string" && lecture_id
      ? db.prepare(`${base} WHERE a.lecture_id = ? ORDER BY a.timestamp DESC`).all(lecture_id)
      : db.prepare(`${base} ORDER BY a.timestamp DESC`).all();

  res.json({ success: true, count: (records as unknown[]).length, records });
});

export default router;
