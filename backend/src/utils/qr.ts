import crypto from "crypto";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

const SECRET = process.env.QR_SECRET || "default_secret";
const EXPIRY = parseInt(process.env.QR_EXPIRY_SECONDS || "60");

export interface QRPayload {
  lecture_id: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

const usedNonces = new Set<string>();

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
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export function verifyQRPayload(payload: QRPayload): {
  valid: boolean;
  reason?: string;
} {
  const now = Math.floor(Date.now() / 1000);

  if (now - payload.timestamp > EXPIRY)
    return { valid: false, reason: "QR code expired" };

  if (usedNonces.has(payload.nonce))
    return { valid: false, reason: "QR code already used" };

  const data = `${payload.lecture_id}:${payload.nonce}:${payload.timestamp}`;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("hex");

  if (expected !== payload.signature)
    return { valid: false, reason: "Invalid QR signature" };

  usedNonces.add(payload.nonce);
  if (usedNonces.size > 1000) usedNonces.clear();

  return { valid: true };
}