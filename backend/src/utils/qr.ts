import crypto from "crypto";
import QRCode from "qrcode";
import { randomUUID } from "crypto";
import { env } from "../config/env";

export interface QRPayload {
  lecture_id: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

function sign(lectureId: string, nonce: string, timestamp: number): string {
  return crypto
    .createHmac("sha256", env.qrSecret)
    .update(`${lectureId}:${nonce}:${timestamp}`)
    .digest("hex");
}

export function generateQRPayload(lectureId: string): QRPayload {
  const nonce = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    lecture_id: lectureId,
    nonce,
    timestamp,
    signature: sign(lectureId, nonce, timestamp),
  };
}

/**
 * Renders an existing payload. It deliberately takes the payload rather than a
 * lecture id: generating one internally would hand the caller an image and a
 * JSON payload carrying two different nonces.
 */
export async function renderQRImage(payload: QRPayload): Promise<string> {
  return QRCode.toDataURL(JSON.stringify(payload), {
    width: 320,
    margin: 2,
    errorCorrectionLevel: "M",
    // Dark modules must actually be dark. An inverted QR is unreadable by most
    // scanners, including the html5-qrcode reader the student app uses.
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export type QRVerification =
  | { valid: true; payload: QRPayload }
  | { valid: false; reason: string };

/**
 * Pure structural check: shape, freshness and signature. Nonce replay is
 * handled separately at commit time so that a failed downstream check does not
 * burn the code.
 */
export function verifyQRPayload(payload: unknown): QRVerification {
  if (!payload || typeof payload !== "object") {
    return { valid: false, reason: "Malformed QR payload" };
  }

  const { lecture_id, nonce, timestamp, signature } = payload as Record<string, unknown>;
  if (
    typeof lecture_id !== "string" ||
    typeof nonce !== "string" ||
    typeof timestamp !== "number" ||
    typeof signature !== "string"
  ) {
    return { valid: false, reason: "Malformed QR payload" };
  }

  const now = Math.floor(Date.now() / 1000);
  // Allow a small negative skew for clients whose clock runs ahead.
  if (timestamp - now > 5) {
    return { valid: false, reason: "QR code is not valid yet — check your device clock" };
  }
  if (now - timestamp > env.qrExpirySeconds) {
    return { valid: false, reason: "QR code expired — scan the current code" };
  }

  const expected = sign(lecture_id, nonce, timestamp);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: "Invalid QR signature — possible forgery" };
  }

  return { valid: true, payload: { lecture_id, nonce, timestamp, signature } };
}
