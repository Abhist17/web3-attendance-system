"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { markAttendance, getStudent } from "@/lib/api";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import dynamic from "next/dynamic";

const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });

type Status = "idle" | "submitting" | "done" | "error";

export default function StudentPage() {
  const { publicKey } = useWallet();
  const [mounted, setMounted]     = useState(false);
  const [status, setStatus]       = useState<Status>("idle");
  const [message, setMessage]     = useState("");
  const [checks, setChecks]       = useState<string[]>([]);
  const [history, setHistory]     = useState<any[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!publicKey) return;
    getStudent(publicKey.toString())
      .then((r) => setHistory(r.data.attendance))
      .catch(() => {});
  }, [publicKey, status]);

  const add = (msg: string) => setChecks((c) => [...c, msg]);

  const handleScan = async (raw: string) => {
    if (!publicKey) { setMessage("CONNECT WALLET FIRST"); setStatus("error"); return; }
    setStatus("submitting");
    setChecks([]);
    try {
      add("QR PAYLOAD RECEIVED");
      const payload = JSON.parse(raw);

      add("ACQUIRING GEOLOCATION...");
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      );
      add("LOCATION ACQUIRED");

      add("READING DEVICE FINGERPRINT...");
      const fp = getDeviceFingerprint();
      add("FINGERPRINT CAPTURED");

      add("SUBMITTING TO VERIFICATION LAYER...");
      await markAttendance({
        lecture_id: payload.lecture_id,
        student_wallet: publicKey.toString(),
        qr_payload: payload,
        student_lat: pos.coords.latitude,
        student_lng: pos.coords.longitude,
        device_fingerprint: fp,
      });

      add("ALL 7 CHECKS PASSED");
      add("ATTENDANCE RECORDED");
      setStatus("done");
      setMessage(`CONFIRMED · LECTURE_${payload.lecture_id}`);
    } catch (e: any) {
      add("VERIFICATION FAILED");
      setStatus("error");
      setMessage(e.response?.data?.error || e.message || "UNKNOWN ERROR");
    }
  };

  const reset = () => { setStatus("idle"); setChecks([]); setMessage(""); };

  if (!mounted) return null;

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6 relative z-10">
      <div>
        <p className="text-xs text-[#2a2a2a] tracking-[0.2em] mb-2">SYSTEM :: STUDENT</p>
        <h1 className="font-display text-2xl font-black text-white tracking-[0.1em]">MARK ATTENDANCE</h1>
      </div>

      {!publicKey ? (
        <div className="card p-4">
          <p className="text-xs text-[#444] tracking-[0.15em]">CONNECT WALLET TO PROCEED</p>
        </div>
      ) : (
        <div className="card p-3 flex items-center gap-3">
          <div className="dot" />
          <span className="text-xs text-[#333] tracking-[0.1em]">WALLET</span>
          <span className="text-xs text-white truncate">{publicKey.toString()}</span>
        </div>
      )}

      <div className="card p-6">
        {status === "idle" && (
          <div className="flex flex-col items-center gap-5">
            <p className="text-xs text-[#2a2a2a] tracking-[0.2em] self-start">SCAN_QR_CODE</p>
            <QRScanner onScan={handleScan} />
          </div>
        )}

        {status === "submitting" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#2a2a2a] tracking-[0.2em]">VERIFICATION_PIPELINE</p>
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-1 h-1 rounded-full flex-shrink-0 ${c.includes("FAILED") ? "bg-[#333]" : "bg-white"}`} />
                <span className={`text-xs tracking-[0.08em] ${c.includes("FAILED") ? "text-[#333]" : "text-white"}`}>{c}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-1">
              <div className="spinner w-3 h-3 flex-shrink-0" />
              <span className="text-xs text-[#333] tracking-[0.1em]">PROCESSING...</span>
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="flex flex-col items-center gap-5 py-4">
            <p className="font-display text-3xl font-black text-white tracking-[0.1em]">CONFIRMED</p>
            <p className="text-xs text-[#888] tracking-[0.15em] text-center">{message}</p>
            <div className="w-full flex flex-col gap-1.5 border-t border-[#0f0f0f] pt-4">
              {checks.map((c, i) => (
                <p key={i} className="text-xs text-[#444] tracking-[0.08em]">— {c}</p>
              ))}
            </div>
            <button onClick={reset} className="btn-ghost px-8 py-2 text-xs tracking-[0.15em] mt-2">
              SCAN ANOTHER
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-5 py-4">
            <p className="font-display text-3xl font-black text-[#333] tracking-[0.1em]">REJECTED</p>
            <p className="text-xs text-[#555] tracking-[0.15em] text-center">{message}</p>
            <div className="w-full flex flex-col gap-1.5 border-t border-[#0f0f0f] pt-4">
              {checks.map((c, i) => (
                <p key={i} className={`text-xs tracking-[0.08em] ${c.includes("FAILED") ? "text-[#333]" : "text-[#444]"}`}>
                  — {c}
                </p>
              ))}
            </div>
            <button onClick={reset} className="btn-ghost px-8 py-2 text-xs tracking-[0.15em] mt-2">
              TRY AGAIN
            </button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="card p-6">
          <p className="text-xs text-[#2a2a2a] tracking-[0.2em] mb-4">ATTENDANCE_HISTORY</p>
          <div className="flex flex-col gap-0">
            {history.map((h: any, i: number) => (
              <div key={i} className="flex justify-between py-2 border-b border-[#0d0d0d]">
                <span className="text-xs text-white">LECTURE_{h.lecture_id}</span>
                <span className="text-xs text-[#333]">{new Date(h.timestamp * 1000).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}