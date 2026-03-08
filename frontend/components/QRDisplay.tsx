"use client";
import { useEffect, useState, useCallback } from "react";
import { generateQR } from "@/lib/api";

export default function QRDisplay({ lectureId }: { lectureId: string }) {
  const [qrImage, setQrImage]     = useState("");
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading]     = useState(false);
  const [gen, setGen]             = useState(0);

  const fetchQR = useCallback(async () => {
    setLoading(true);
    try {
      const res = await generateQR(lectureId);
      setQrImage(res.data.qr_image);
      setCountdown(60);
      setGen((g) => g + 1);
    } catch {}
    setLoading(false);
  }, [lectureId]);

  useEffect(() => { fetchQR(); }, [fetchQR]);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((p) => { if (p <= 1) { fetchQR(); return 60; } return p - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [fetchQR]);

  return (
    <div className="card p-6 flex flex-col gap-5">
      <div className="flex justify-between">
        <span className="text-xs text-[#333] tracking-[0.15em]">QR_STREAM</span>
        <span className="text-xs text-[#222]">GEN_{gen.toString().padStart(4,"0")}</span>
      </div>

      <div className="flex items-center justify-center border border-[#111] bg-black p-6">
        {loading ? (
          <div className="w-44 h-44 flex items-center justify-center">
            <div className="spinner w-6 h-6" />
          </div>
        ) : qrImage ? (
          <img src={qrImage} alt="QR Code" className="w-44 h-44" style={{imageRendering:"pixelated"}} />
        ) : null}
      </div>

      <div>
        <div className="flex justify-between text-xs mb-2">
          <span className={countdown <= 15 ? "text-[#555]" : "text-white"}>
            {countdown <= 15 ? "EXPIRING" : "ACTIVE"}
          </span>
          <span className="text-[#333]">{countdown}s</span>
        </div>
        <div className="w-full h-px bg-[#111]">
          <div
            className="h-px bg-white transition-all duration-1000"
            style={{ width: `${(countdown/60)*100}%`, opacity: countdown <= 15 ? 0.35 : 0.9 }}
          />
        </div>
      </div>

      <p className="text-xs text-[#1e1e1e] tracking-[0.1em] text-center">
        ROTATES EVERY 60S · SCREENSHOT SHARING BLOCKED
      </p>
    </div>
  );
}