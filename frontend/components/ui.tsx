"use client";

import { ReactNode, useEffect, useState } from "react";

/** True only after the first client render — use to gate wallet-dependent UI. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="flex flex-col gap-2">
      <p className="label">{eyebrow}</p>
      <h1 className="font-display text-2xl sm:text-3xl font-black tracking-[0.08em] text-fg">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-fg-muted leading-relaxed max-w-prose">{description}</p>
      )}
    </header>
  );
}

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 sm:p-6 flex flex-col gap-4 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4">
          {title && <h2 className="label">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = "info" | "ok" | "warn" | "danger";

const TONE_STYLES: Record<Tone, string> = {
  info: "border-ink-600 text-fg-muted",
  ok: "border-ok/40 text-ok",
  warn: "border-warn/40 text-warn",
  danger: "border-danger/40 text-danger",
};

export function Banner({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`border rounded-[3px] px-4 py-3 text-xs leading-relaxed tracking-[0.06em] ${TONE_STYLES[tone]}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-fg-faint tracking-[0.12em] uppercase py-6 text-center">
      {children}
    </p>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="text-xs text-fg-faint leading-relaxed">{hint}</span>}
    </label>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="kv">
      <span className="label shrink-0">{label}</span>
      <span className="text-xs text-fg text-right break-all">{children}</span>
    </div>
  );
}

export function truncateAddress(address: string, lead = 6, tail = 6): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

export function ExplorerLink({
  signature,
  className = "",
}: {
  signature: string;
  className?: string;
}) {
  return (
    <a
      href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-xs text-fg-muted underline underline-offset-4 hover:text-fg transition-colors ${className}`}
    >
      {truncateAddress(signature, 8, 8)}
    </a>
  );
}

/** Shown in place of page content when no wallet is connected. */
export function WalletGate({ message }: { message: string }) {
  return (
    <div className="card p-8 flex flex-col items-center gap-3 text-center">
      <div className="text-fg-subtle">
        <span className="dot inline-block" />
      </div>
      <p className="text-sm text-fg">Wallet not connected</p>
      <p className="text-xs text-fg-muted max-w-xs leading-relaxed">{message}</p>
    </div>
  );
}
