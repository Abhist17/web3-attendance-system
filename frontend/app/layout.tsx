import type { Metadata } from "next";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/WalletProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "WEB3.ATTEND",
  description: "Decentralized tamper-proof attendance on Solana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SolanaWalletProvider>
          <Navbar />
          <div className="relative z-10 max-w-6xl mx-auto px-4 py-10">
            {children}
          </div>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}