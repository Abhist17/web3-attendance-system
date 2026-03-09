"use client";
import { useEffect, useState } from "react";
import { SolanaWalletProvider } from "@/components/WalletProvider";
import Navbar from "@/components/Navbar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <span style={{
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#333",
        letterSpacing: "0.2em"
      }}>
        INITIALIZING...
      </span>
    </div>
  );

  return (
    <SolanaWalletProvider>
      <Navbar />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        {children}
      </div>
    </SolanaWalletProvider>
  );
}