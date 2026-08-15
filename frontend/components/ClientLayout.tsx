"use client";

import { SolanaWalletProvider } from "@/components/WalletProvider";
import Navbar from "@/components/Navbar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </main>
        <footer className="border-t border-ink-800 px-4 py-6 sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-fg-faint tracking-[0.12em] uppercase">
              Solana devnet · Anchor
            </p>
            <a
              href={`https://explorer.solana.com/address/${process.env.NEXT_PUBLIC_PROGRAM_ID ?? ""}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-fg-faint hover:text-fg-muted transition-colors break-all"
            >
              {process.env.NEXT_PUBLIC_PROGRAM_ID}
            </a>
          </div>
        </footer>
      </div>
    </SolanaWalletProvider>
  );
}
