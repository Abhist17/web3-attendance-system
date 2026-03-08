import {
  Connection,
  PublicKey,
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";
import { AnchorProvider, Program, web3, BN } from "@coral-xyz/anchor";

export const PROGRAM_ID = new PublicKey(
  "6p26MgeSFbR7UFdrsUU62sbNH8Zh1bY59ob8NmfdibBc"
);

export const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export function getStudentPDA(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("student"), wallet.toBuffer()],
    PROGRAM_ID
  );
}

export function getLecturePDA(lectureId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(lectureId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("lecture"), buf],
    PROGRAM_ID
  );
}

export function getAttendancePDA(
  wallet: PublicKey,
  lectureId: number
): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(lectureId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("attendance"), wallet.toBuffer(), buf],
    PROGRAM_ID
  );
}