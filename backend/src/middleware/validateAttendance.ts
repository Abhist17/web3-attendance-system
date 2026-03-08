import { Request, Response, NextFunction } from "express";
import { verifyQRPayload, QRPayload } from "../utils/qr";
import { isWithinRadius, Coordinates } from "../utils/geo";

export interface LectureLocation {
  lat: number;
  lng: number;
}

const lectureLocations: Record<string, LectureLocation> = {};

export function setLectureLocation(lectureId: string, coords: LectureLocation) {
  lectureLocations[lectureId] = coords;
}

export function validateAttendanceRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { qr_payload, student_lat, student_lng, lecture_id } = req.body;

  if (!qr_payload || student_lat === undefined || student_lng === undefined || !lecture_id) {
    res.status(400).json({ success: false, error: "Missing required fields" });
    return;
  }

  let parsed: QRPayload;
  try {
    parsed = typeof qr_payload === "string" ? JSON.parse(qr_payload) : qr_payload;
  } catch {
    res.status(400).json({ success: false, error: "Invalid QR payload format" });
    return;
  }

  const qrResult = verifyQRPayload(parsed);
  if (!qrResult.valid) {
    res.status(400).json({ success: false, error: qrResult.reason });
    return;
  }

  if (parsed.lecture_id !== lecture_id) {
    res.status(400).json({ success: false, error: "Lecture ID mismatch" });
    return;
  }

  const classroom = lectureLocations[lecture_id];
  if (classroom) {
    const studentCoords: Coordinates = {
      lat: parseFloat(student_lat),
      lng: parseFloat(student_lng),
    };
    const geoResult = isWithinRadius(studentCoords, classroom);
    if (!geoResult.allowed) {
      res.status(403).json({
        success: false,
        error: `Too far from classroom (${geoResult.distance}m away, max 50m)`,
      });
      return;
    }
  }

  next();
}