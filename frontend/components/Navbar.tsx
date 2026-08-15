"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  {
    ssr: false,
    loading: () => (
      <div className="h-9 w-32 rounded-[3px] border border-ink-700 bg-ink-900" aria-hidden />
    ),
  }
);

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/register", label: "Register" },
  { href: "/professor", label: "Professor" },
  { href: "/student", label: "Student" },
];

export default function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (href: string) =>
    `text-xs uppercase tracking-[0.15em] transition-colors ${
      path === href ? "text-fg" : "text-fg-subtle hover:text-fg"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-xs font-black tracking-[0.22em] text-fg">
            WEB3.ATTEND
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={path === l.href ? "page" : undefined}
                className={linkClass(l.href)}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-fg-subtle sm:flex">
            <span className="dot" />
            <span className="text-xs uppercase tracking-[0.15em]">Devnet</span>
          </span>
          <WalletMultiButton />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Toggle navigation"
            className="btn btn-ghost h-9 w-9 md:hidden"
          >
            {open ? "×" : "≡"}
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-1 border-t border-ink-800 px-4 py-3 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={path === l.href ? "page" : undefined}
              className={`${linkClass(l.href)} py-2`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
