import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const DEFAULT_SECRETS = new Set([
  "super_secret_hmac_key_change_in_production",
  "jwt_secret_key_change_in_production",
  "default_secret",
]);

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a number, got "${raw}"`);
  }
  return parsed;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: num("PORT", 5000),
  programId: required("PROGRAM_ID"),
  solanaNetwork: process.env.SOLANA_NETWORK ?? "devnet",
  solanaRpcUrl: process.env.SOLANA_RPC_URL ?? "",
  qrSecret: required("QR_SECRET"),
  qrExpirySeconds: num("QR_EXPIRY_SECONDS", 60),
  allowedRadiusMeters: num("ALLOWED_RADIUS_METERS", 50),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};

export const isProduction = env.nodeEnv === "production";

// A shipped default secret would let anyone forge QR payloads, so refuse to
// boot with one outside of local development.
if (isProduction && DEFAULT_SECRETS.has(env.qrSecret)) {
  throw new Error(
    "QR_SECRET is still set to the example value. Generate a real one before running in production."
  );
}
