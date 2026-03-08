import { Request, Response, NextFunction } from "express";
import { verifyQRPayload, QRPayload } from "../utils/qr";
import { isWithinRadius } from "../utils/geo";
import { validateDeviceFingerprint } from "../utils/device";
import db from "../config/database";

export function validateAttendanceRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const {
    qr_payload,
    student_lat,
    student_lng,
    lecture_id,
    student_wallet,
    device_fingerprint,
  } = req.body;

  // 1. Required fields
  if (
    !qr_payload ||
    student_lat === undefined ||
    student_lng === undefined ||
    !lecture_id ||
    !student_wallet
  ) {
    res.status(400).json({ success: false, error: "Missing required fields" });
    return;
  }

  // 2. Parse QR
  let parsed: QRPayload;
  try {
    parsed = typeof qr_payload === "string" ? JSON.parse(qr_payload) : qr_payload;
  } catch {
    res.status(400).json({ success: false, error: "Invalid QR payload format" });
    return;
  }

  // 3. Verify QR (expiry + signature + nonce uniqueness)
  const qrResult = verifyQRPayload(parsed);
  if (!qrResult.valid) {
    res.status(400).json({ success: false, error: qrResult.reason });
    return;
  }

  // 4. Lecture ID match
  if (parsed.lecture_id !== lecture_id) {
    res.status(400).json({ success: false, error: "Lecture ID mismatch" });
    return;
  }

  // 5. Lecture exists and time window check
  const lecture = db
    .prepare("SELECT * FROM lectures WHERE lecture_id = ?")
    .get(lecture_id) as any;
  if (!lecture) {
    res.status(404).json({ success: false, error: "Lecture not found" });
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  if (now < lecture.start_time) {
    res.status(403).json({ success: false, error: "Lecture has not started yet" });
    return;
  }
  if (now > lecture.deadline) {
    res.status(403).json({ success: false, error: "Attendance window is closed" });
    return;
  }

  // 6. Student registered check + wallet match
  const student = db
    .prepare("SELECT * FROM students WHERE wallet = ?")
    .get(student_wallet) as any;
  if (!student) {
    res.status(403).json({ success: false, error: "Student not registered — register first" });
    return;
  }

  // 7. Device fingerprint check
  if (device_fingerprint) {
    const deviceResult = validateDeviceFingerprint(
      student.device_fingerprint,
      device_fingerprint
    );
    if (!deviceResult.valid) {
      res.status(403).json({ success: false, error: deviceResult.reason });
      return;
    }
  }

  // 8. Geolocation check
  if (lecture.classroom_lat && lecture.classroom_lng) {
    const geoResult = isWithinRadius(
      { lat: parseFloat(student_lat), lng: parseFloat(student_lng) },
      { lat: lecture.classroom_lat, lng: lecture.classroom_lng }
    );
    if (!geoResult.allowed) {
      res.status(403).json({
        success: false,
        error: `Too far from classroom (${geoResult.distance}m away, max 50m allowed)`,
      });
      return;
    }
  }

  // 9. Duplicate check
  const duplicate = db
    .prepare("SELECT id FROM attendance WHERE student_wallet = ? AND lecture_id = ?")
    .get(student_wallet, lecture_id);
  if (duplicate) {
    res.status(409).json({ success: false, error: "Attendance already marked for this lecture" });
    return;
  }

  next();
}