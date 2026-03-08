import crypto from "crypto";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import db from "../config/database";
dotenv.config();

const SECRET = process.env.QR_SECRET || "default_secret";
const EXPIRY = parseInt(process.env.QR_EXPIRY_SECONDS || "60");

export interface QRPayload {
  lecture_id: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

export function generateQRPayload(lectureId: string): QRPayload {
  const nonce = uuidv4();
  const timestamp = Math.floor(Date.now() / 1000);
  const data = `${lectureId}:${nonce}:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("hex");
  return { lecture_id: lectureId, nonce, timestamp, signature };
}

export async function generateQRImage(lectureId: string): Promise<string> {
  const payload = generateQRPayload(lectureId);
  const json = JSON.stringify(payload);
  return await QRCode.toDataURL(json, {
    width: 300,
    margin: 2,
    color: { dark: "#ffffff", light: "#000000" },
  });
}

export function verifyQRPayload(payload: QRPayload): {
  valid: boolean;
  reason?: string;
} {
  const now = Math.floor(Date.now() / 1000);

  // 1. Check expiry
  if (now - payload.timestamp > EXPIRY)
    return { valid: false, reason: "QR code expired — ask professor to refresh" };

  // 2. Verify HMAC signature
  const data = `${payload.lecture_id}:${payload.nonce}:${payload.timestamp}`;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("hex");
  if (expected !== payload.signature)
    return { valid: false, reason: "Invalid QR signature — possible forgery detected" };

  // 3. Check nonce not reused (DB-backed, survives restarts)
  const existing = db
    .prepare("SELECT nonce FROM used_nonces WHERE nonce = ?")
    .get(payload.nonce);
  if (existing)
    return { valid: false, reason: "QR code already used — proxy attempt blocked" };

  // 4. Mark nonce as used atomically
  db.prepare("INSERT INTO used_nonces (nonce) VALUES (?)").run(payload.nonce);

  return { valid: true };
}