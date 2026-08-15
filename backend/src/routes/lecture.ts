import { Router, Request, Response } from "express";
import db from "../config/database";

const router = Router();

const MAX_LECTURE_ID_LEN = 32; // must match the on-chain PDA seed limit
const MAX_SUBJECT_LEN = 100;

// POST /api/lecture/create
router.post("/create", (req: Request, res: Response) => {
  const {
    lecture_id,
    subject,
    professor_wallet,
    start_time,
    deadline,
    classroom_lat,
    classroom_lng,
    solana_tx,
  } = req.body ?? {};

  if (!lecture_id || !subject || !professor_wallet) {
    res
      .status(400)
      .json({ success: false, error: "lecture_id, subject and professor_wallet are required" });
    return;
  }

  if (typeof lecture_id !== "string" || lecture_id.length > MAX_LECTURE_ID_LEN) {
    res.status(400).json({
      success: false,
      error: `lecture_id must be a string of at most ${MAX_LECTURE_ID_LEN} characters`,
    });
    return;
  }

  if (typeof subject !== "string" || subject.length > MAX_SUBJECT_LEN) {
    res.status(400).json({
      success: false,
      error: `subject must be a string of at most ${MAX_SUBJECT_LEN} characters`,
    });
    return;
  }

  const start = Number(start_time);
  const end = Number(deadline);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    res.status(400).json({ success: false, error: "start_time and deadline must be unix seconds" });
    return;
  }
  if (end <= start) {
    res.status(400).json({ success: false, error: "deadline must be after start_time" });
    return;
  }

  const hasLat = classroom_lat !== undefined && classroom_lat !== null && classroom_lat !== "";
  const hasLng = classroom_lng !== undefined && classroom_lng !== null && classroom_lng !== "";
  if (hasLat !== hasLng) {
    res
      .status(400)
      .json({ success: false, error: "classroom_lat and classroom_lng must be provided together" });
    return;
  }

  let lat: number | null = null;
  let lng: number | null = null;
  if (hasLat && hasLng) {
    lat = Number(classroom_lat);
    lng = Number(classroom_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      res.status(400).json({ success: false, error: "Classroom coordinates are out of range" });
      return;
    }
  }

  const exists = db.prepare("SELECT id FROM lectures WHERE lecture_id = ?").get(lecture_id);
  if (exists) {
    res.status(409).json({ success: false, error: "Lecture ID already exists" });
    return;
  }

  db.prepare(
    `INSERT INTO lectures
       (lecture_id, subject, professor_wallet, classroom_lat, classroom_lng, start_time, deadline, solana_tx)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    lecture_id,
    subject,
    professor_wallet,
    lat,
    lng,
    Math.floor(start),
    Math.floor(end),
    typeof solana_tx === "string" && solana_tx ? solana_tx : null
  );

  res.status(201).json({ success: true, message: "Lecture created", lecture_id });
});

// GET /api/lecture/list?professor_wallet=...
router.get("/list", (req: Request, res: Response) => {
  const { professor_wallet } = req.query;

  const base = `SELECT l.*,
                       (SELECT COUNT(*) FROM attendance a WHERE a.lecture_id = l.lecture_id) AS attendance_count
                FROM lectures l`;

  const lectures =
    typeof professor_wallet === "string" && professor_wallet
      ? db.prepare(`${base} WHERE l.professor_wallet = ? ORDER BY l.created_at DESC`).all(professor_wallet)
      : db.prepare(`${base} ORDER BY l.created_at DESC`).all();

  res.json({ success: true, count: (lectures as unknown[]).length, lectures });
});

// GET /api/lecture/:id
router.get("/:id", (req: Request, res: Response) => {
  const lecture = db
    .prepare("SELECT * FROM lectures WHERE lecture_id = ?")
    .get(req.params.id);
  if (!lecture) {
    res.status(404).json({ success: false, error: "Lecture not found" });
    return;
  }
  res.json({ success: true, lecture });
});

export default router;
