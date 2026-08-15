import { Connection, clusterApiUrl, Cluster } from "@solana/web3.js";
import { env } from "./env";

const endpoint =
  env.solanaRpcUrl || clusterApiUrl((env.solanaNetwork as Cluster) ?? "devnet");

export const connection = new Connection(endpoint, "confirmed");
export const PROGRAM_ID = env.programId;
