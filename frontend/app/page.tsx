"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const LAYERS = [
  "HMAC-SIGNED ROTATING QR",
  "DB-BACKED NONCE (ONE-TIME USE)",
  "GEOLOCATION RADIUS 50M",
  "TIME WINDOW ENFORCEMENT",
  "DEVICE FINGERPRINT BINDING",
  "BLOCKCHAIN DUPLICATE LOCK",
  "WALLET IDENTITY PROOF",
];

export default function Home() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % LAYERS.length), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center gap-16 relative z-10">

      {/* Hero */}
      <div className="text-center flex flex-col gap-4">
        <p className="text-xs text-[#2a2a2a] tracking-[0.4em]">
          SOLANA · ANCHOR · ANTI-PROXY SYSTEM
        </p>
        <h1 className="font-display text-6xl md:text-8xl font-black text-white tracking-tighter leading-none">
          WEB3<br/>ATTEND
        </h1>
        <p className="text-xs text-[#3a3a3a] tracking-[0.2em] max-w-xs mx-auto leading-6">
          DECENTRALIZED ATTENDANCE<br/>
          NO PROXIES · NO FAKES<br/>
          EVERY RECORD ON-CHAIN
        </p>
      </div>

      {/* Layers */}
      <div className="card w-full max-w-sm p-6 flex flex-col gap-1">
        <p className="text-xs text-[#2a2a2a] tracking-[0.2em] mb-4">
          ANTI-PROXY LAYERS
        </p>
        {LAYERS.map((layer, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[#0d0d0d] last:border-0">
            <div className={`w-1 h-1 rounded-full flex-shrink-0 transition-all duration-500 ${
              i < active ? "bg-white" : i === active ? "bg-white animate-pulse" : "bg-[#1a1a1a]"
            }`} />
            <span className={`text-xs tracking-[0.1em] flex-1 transition-colors duration-300 ${
              i <= active ? "text-white" : "text-[#252525]"
            }`}>
              {layer}
            </span>
            {i < active  && <span className="text-xs text-[#3a3a3a]">OK</span>}
            {i === active && <span className="text-xs text-white blink">_</span>}
          </div>
        ))}
      </div>

      {/* Nav */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {[
          { href: "/register",  label: "REGISTER",  desc: "Bind wallet" },
          { href: "/professor", label: "PROFESSOR", desc: "Create QR"   },
          { href: "/student",   label: "STUDENT",   desc: "Scan & mark" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="card p-4 text-center cursor-pointer hover:bg-[#0f0f0f] transition-colors">
              <p className="font-display text-xs font-bold text-white tracking-[0.1em] mb-1">{item.label}</p>
              <p className="text-xs text-[#333]">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <p className="text-xs text-[#181818] tracking-widest font-mono">
        6p26MgeSFbR7UFdrsUU62sbNH8Zh1bY59ob8NmfdibBc
      </p>
    </div>
  );
}