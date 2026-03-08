"use client";
import { useEffect, useRef, useState } from "react";

interface Props { onScan: (data: string) => void; }

export default function QRScanner({ onScan }: Props) {
  const [active, setActive] = useState(false);
  const [error, setError]   = useState("");
  const ref = useRef<any>(null);

  const start = async () => {
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const s = new Html5Qrcode("qr-box");
      ref.current = s;
      await s.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (text: string) => { onScan(text); stop(); },
        () => {}
      );
      setActive(true);
    } catch {
      setError("CAMERA ACCESS DENIED — ALLOW PERMISSIONS AND RETRY");
    }
  };

  const stop = async () => {
    try { if (ref.current) { await ref.current.stop(); ref.current = null; } } catch {}
    setActive(false);
  };

  useEffect(() => () => { stop(); }, []);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div
        id="qr-box"
        className="w-64 h-64 border border-[#1a1a1a] bg-black overflow-hidden relative flex items-center justify-center"
      >
        {!active && <span className="text-xs text-[#252525] tracking-[0.15em]">CAMERA_INACTIVE</span>}
        {active && (
          <>
            <div className="absolute top-2 left-2  w-5 h-5 border-t border-l border-white" />
            <div className="absolute top-2 right-2 w-5 h-5 border-t border-r border-white" />
            <div className="absolute bottom-2 left-2  w-5 h-5 border-b border-l border-white" />
            <div className="absolute bottom-2 right-2 w-5 h-5 border-b border-r border-white" />
          </>
        )}
      </div>

      {error && <p className="text-xs text-[#555] tracking-[0.1em] text-center">{error}</p>}

      {!active
        ? <button onClick={start} className="btn-primary px-10 py-3 text-xs tracking-[0.15em]">ACTIVATE SCANNER</button>
        : <button onClick={stop}  className="btn-ghost  px-8  py-2 text-xs tracking-[0.15em]">DEACTIVATE</button>
      }
    </div>
  );
}