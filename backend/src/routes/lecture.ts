import { Router, Request, Response } from "express";
import db from "../config/database";

const router = Router();

// POST /api/lecture/create
router.post("/create", (req: Request, res: Response) => {
  const {
    lecture_id, subject, professor_wallet,
    start_time, deadline, classroom_lat, classroom_lng,
  } = req.body;

  if (!lecture_id || !subject || !professor_wallet || !start_time || !deadline) {
    res.status(400).json({ success: false, error: "Missing fields" });
    return;
  }

  const exists = db
    .prepare("SELECT id FROM lectures WHERE lecture_id = ?")
    .get(lecture_id);
  if (exists) {
    res.status(409).json({ success: false, error: "Lecture ID already exists" });
    return;
  }

  db.prepare(
    "INSERT INTO lectures (lecture_id, subject, professor_wallet, classroom_lat, classroom_lng, start_time, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    lecture_id, subject, professor_wallet,
    classroom_lat || null, classroom_lng || null,
    start_time, deadline
  );

  res.json({ success: true, message: "Lecture created", lecture_id });
});

// GET /api/lecture/list
router.get("/list", (_req: Request, res: Response) => {
  const lectures = db.prepare("SELECT * FROM lectures ORDER BY created_at DESC").all();
  res.json({ success: true, lectures });
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