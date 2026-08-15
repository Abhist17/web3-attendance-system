"use client";

import { useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import idl from "./idl/attendance.json";
import type { Attendance } from "./idl/attendance";

export const PROGRAM_ID = new PublicKey(idl.address);

/** Mirrors the on-chain seed-length limits in programs/attendance/src/lib.rs. */
export const MAX_LECTURE_ID_LEN = 32;
export const MAX_STUDENT_ID_LEN = 32;

const enc = new TextEncoder();

export function getStudentPDA(wallet: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [enc.encode("student"), wallet.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function getLecturePDA(lectureId: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [enc.encode("lecture"), enc.encode(lectureId)],
    PROGRAM_ID
  )[0];
}

export function getAttendancePDA(wallet: PublicKey, lectureId: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [enc.encode("attendance"), wallet.toBuffer(), enc.encode(lectureId)],
    PROGRAM_ID
  )[0];
}

export type AttendanceProgram = Program<Attendance>;

/** Null until a wallet is connected — every instruction needs a signer. */
export function useAttendanceProgram(): AttendanceProgram | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    return new Program(idl as Attendance, provider);
  }, [connection, wallet]);
}

async function accountExists(program: AttendanceProgram, address: PublicKey): Promise<boolean> {
  const info = await program.provider.connection.getAccountInfo(address);
  return info !== null;
}

export function isStudentRegisteredOnChain(
  program: AttendanceProgram,
  wallet: PublicKey
): Promise<boolean> {
  return accountExists(program, getStudentPDA(wallet));
}

export function isLectureOnChain(
  program: AttendanceProgram,
  lectureId: string
): Promise<boolean> {
  return accountExists(program, getLecturePDA(lectureId));
}

/*
 * The IDL carries the PDA seed definitions, so Anchor derives `studentProfile`,
 * `lecture` and `attendanceRecord` itself, fills in `systemProgram`, and takes
 * the signer from the provider. Passing them explicitly is a type error, hence
 * the empty `.accounts({})`.
 */

export async function registerStudentOnChain(
  program: AttendanceProgram,
  args: { studentId: string; name: string; department: string }
): Promise<string> {
  return program.methods
    .registerStudent(args.studentId, args.name, args.department)
    .accounts({})
    .rpc();
}

export async function createLectureOnChain(
  program: AttendanceProgram,
  args: { lectureId: string; subject: string; startTime: number; deadline: number }
): Promise<string> {
  return program.methods
    .createLecture(args.lectureId, args.subject, new BN(args.startTime), new BN(args.deadline))
    .accounts({})
    .rpc();
}

export async function markAttendanceOnChain(
  program: AttendanceProgram,
  lectureId: string
): Promise<string> {
  return program.methods.markAttendance(lectureId).accounts({}).rpc();
}

/** Turns Anchor/wallet errors into something a student can act on. */
export function chainErrorMessage(err: unknown, fallback = "Transaction failed"): string {
  const message = err instanceof Error ? err.message : String(err ?? "");

  if (/User rejected|rejected the request/i.test(message)) {
    return "You rejected the transaction in your wallet.";
  }
  if (/already in use|already been processed/i.test(message)) {
    return "This record already exists on-chain.";
  }
  if (/insufficient|0x1\b/i.test(message) && /lamports|funds|balance/i.test(message)) {
    return "Not enough devnet SOL to pay the transaction fee. Airdrop some and retry.";
  }
  if (/blockhash not found|Blockhash/i.test(message)) {
    return "The network dropped the transaction. Please try again.";
  }
  return message || fallback;
}

export function explorerTxUrl(signature: string, cluster = "devnet"): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}
