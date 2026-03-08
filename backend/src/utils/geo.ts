import dotenv from "dotenv";
dotenv.config();

const ALLOWED_RADIUS = parseFloat(process.env.ALLOWED_RADIUS_METERS || "50");

export interface Coordinates {
  lat: number;
  lng: number;
}

export function getDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function isWithinRadius(
  studentCoords: Coordinates,
  classroomCoords: Coordinates,
  radiusMeters: number = ALLOWED_RADIUS
): { allowed: boolean; distance: number } {
  const distance = getDistance(studentCoords, classroomCoords);
  return { allowed: distance <= radiusMeters, distance: Math.round(distance) };
}