import crypto from "crypto";

export function hashFingerprint(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function validateDeviceFingerprint(
  stored: string | null,
  incoming: string
): { valid: boolean; reason?: string } {
  if (!stored) return { valid: true }; // not registered yet, allow
  const incomingHash = hashFingerprint(incoming);
  if (stored !== incomingHash)
    return { valid: false, reason: "Device mismatch — attendance must be from your registered device" };
  return { valid: true };
}