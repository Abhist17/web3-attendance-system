import { Connection, clusterApiUrl } from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

export const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
export const PROGRAM_ID = process.env.PROGRAM_ID || "";