import { Router, Request, Response } from "express";

const router = Router();

const lectures: Array<{
  lecture_id: string;
  subject: string;
  professor_wallet: string;
  start_time: number;
  deadline: number;
}> = [];

router.post("/create", (req: Request, res: Response) => {
  const { lecture_id, subject, professor_wallet, start_time, deadline } = req.body;

  if (!lecture_id || !subject || !professor_wallet || !start_time || !deadline) {
    res.status(400).json({ success: false, error: "Missing fields" });
    return;
  }

  if (lectures.find((l) => l.lecture_id === lecture_id)) {
    res.status(409).json({ success: false, error: "Lecture already exists" });
    return;
  }

  const lecture = { lecture_id, subject, professor_wallet, start_time, deadline };
  lectures.push(lecture);
  res.json({ success: true, lecture });
});

router.get("/list", (_req: Request, res: Response) => {
  res.json({ success: true, lectures });
});

router.get("/:id", (req: Request, res: Response) => {
  const lecture = lectures.find((l) => l.lecture_id === req.params.id);
  if (!lecture) {
    res.status(404).json({ success: false, error: "Lecture not found" });
    return;
  }
  res.json({ success: true, lecture });
});

export default router;