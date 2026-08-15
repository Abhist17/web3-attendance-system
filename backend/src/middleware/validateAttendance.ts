import { Request, Response, NextFunction } from "express";
import { verifyQRPayload, QRPayload } from "../utils/qr";
import { isWithinRadius } from "../utils/geo";
import { validateDeviceFingerprint } from "../utils/device";
import db from "../config/database";

export interface LectureRow {
  lecture_id: string;
  subject: string;
  professor_wallet: string;
  classroom_lat: number | null;
  classroom_lng: number | null;
  start_time: number;
  deadline: number;
}

export interface StudentRow {
  wallet: string;
  student_id: string;
  name: string;
  department: string;
  device_fingerprint: string | null;
}

/** Everything the route handler needs, already validated. */
export interface ValidatedAttendance {
  payload: QRPayload;
  lecture: LectureRow;
  student: StudentRow;
  lat: number;
  lng: number;
  distance: number | null;
}

declare module "express-serve-static-core" {
  interface Request {
    attendance?: ValidatedAttendance;
  }
}

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ success: false, error });
}

/**
 * Runs every anti-proxy check. Deliberately performs no writes: the nonce is
 * consumed by the route handler inside the same transaction as the insert, so a
 * request that fails a later check does not invalidate the QR code.
 */
export function validateAttendanceRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { qr_payload, student_lat, student_lng, student_wallet, device_fingerprint } =
    req.body ?? {};

  if (typeof student_wallet !== "string" || !student_wallet) {
    return fail(res, 400, "student_wallet is required");
  }

  const lat = Number(student_lat);
  const lng = Number(student_lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return fail(res, 400, "A valid location is required to mark attendance");
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return fail(res, 400, "Location is out of range");
  }

  let parsed: unknown = qr_payload;
  if (typeof qr_payload === "string") {
    try {
      parsed = JSON.parse(qr_payload);
    } catch {
      return fail(res, 400, "Invalid QR payload format");
    }
  }

  const qrResult = verifyQRPayload(parsed);
  if (!qrResult.valid) return fail(res, 400, qrResult.reason);
  const payload = qrResult.payload;

  // The lecture is taken from the signed payload rather than the request body,
  // so a client cannot pair a valid QR code with a different lecture.
  const lecture = db
    .prepare("SELECT * FROM lectures WHERE lecture_id = ?")
    .get(payload.lecture_id) as LectureRow | undefined;
  if (!lecture) return fail(res, 404, "Lecture not found");

  const now = Math.floor(Date.now() / 1000);
  if (now < lecture.start_time) return fail(res, 403, "Lecture has not started yet");
  if (now > lecture.deadline) return fail(res, 403, "Attendance window is closed");

  const student = db
    .prepare("SELECT * FROM students WHERE wallet = ?")
    .get(student_wallet) as StudentRow | undefined;
  if (!student) return fail(res, 403, "Wallet is not registered — register first");

  if (student.device_fingerprint) {
    if (typeof device_fingerprint !== "string" || !device_fingerprint) {
      return fail(res, 403, "Device fingerprint is required for this account");
    }
    const deviceResult = validateDeviceFingerprint(
      student.device_fingerprint,
      device_fingerprint
    );
    if (!deviceResult.valid) return fail(res, 403, deviceResult.reason!);
  }

  let distance: number | null = null;
  if (lecture.classroom_lat !== null && lecture.classroom_lng !== null) {
    const geo = isWithinRadius(
      { lat, lng },
      { lat: lecture.classroom_lat, lng: lecture.classroom_lng }
    );
    distance = geo.distance;
    if (!geo.allowed) {
      return fail(
        res,
        403,
        `Too far from the classroom — you are ${geo.distance}m away, the limit is ${geo.radius}m`
      );
    }
  }

  const duplicate = db
    .prepare("SELECT id FROM attendance WHERE student_wallet = ? AND lecture_id = ?")
    .get(student_wallet, payload.lecture_id);
  if (duplicate) return fail(res, 409, "Attendance already marked for this lecture");

  const replayed = db
    .prepare("SELECT nonce FROM used_nonces WHERE nonce = ? AND student_wallet = ?")
    .get(payload.nonce, student_wallet);
  if (replayed) return fail(res, 409, "This QR code was already used by your wallet");

  req.attendance = { payload, lecture, student, lat, lng, distance };
  next();
}
