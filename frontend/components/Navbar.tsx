"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false, loading: () => (
    <button style={{
      background: "transparent",
      border: "1px solid #2a2a2a",
      color: "#333",
      fontFamily: "monospace",
      fontSize: "12px",
      padding: "8px 18px",
      letterSpacing: "0.1em",
      cursor: "wait",
      borderRadius: "2px"
    }}>
      LOADING...
    </button>
  )}
);

export default function Navbar() {
  const path = usePathname();
  const links = [
    { href: "/",          label: "HOME"      },
    { href: "/register",  label: "REGISTER"  },
    { href: "/professor", label: "PROFESSOR" },
    { href: "/student",   label: "STUDENT"   },
  ];

  return (
    <nav className="border-b border-[#111] bg-black relative z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/">
            <span className="font-display text-xs font-black tracking-[0.25em] text-white">
              WEB3.ATTEND
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link key={l.href} href={l.href}
                className={`text-xs tracking-[0.15em] transition-colors ${
                  path === l.href ? "text-white" : "text-[#3a3a3a] hover:text-[#888]"
                }`}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <div className="dot" />
            <span className="text-xs text-[#2a2a2a] tracking-[0.15em]">DEVNET</span>
          </div>
          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
}