"use client";

import { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

const NETWORK =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as WalletAdapterNetwork) ??
  WalletAdapterNetwork.Devnet;

export const SolanaWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(NETWORK),
    []
  );

  // Wallet Standard adapters (Phantom, Solflare, Backpack…) register themselves
  // with the browser, so an explicit adapter list is no longer required.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
