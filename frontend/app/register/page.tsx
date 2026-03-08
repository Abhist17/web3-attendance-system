"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { registerStudent, getStudent } from "@/lib/api";
import { getDeviceFingerprint } from "@/lib/fingerprint";

const DEPTS = ["Computer Science","Electronics","Mechanical","Civil","Mathematics","Physics"];

export default function RegisterPage() {
  const { publicKey } = useWallet();
  const [mounted, setMounted]     = useState(false);
  const [form, setForm]           = useState({ student_id: "", name: "", department: "" });
  const [status, setStatus]       = useState<"idle"|"loading"|"done"|"error">("idle");
  const [message, setMessage]     = useState("");
  const [existing, setExisting]   = useState<any>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!publicKey) return;
    getStudent(publicKey.toString())
      .then((r) => setExisting(r.data.student))
      .catch(() => setExisting(null));
  }, [publicKey]);

  const handle = async () => {
    if (!publicKey) return setMessage("CONNECT WALLET FIRST");
    if (!form.student_id || !form.name || !form.department) return setMessage("FILL ALL FIELDS");
    setStatus("loading");
    try {
      await registerStudent({
        wallet: publicKey.toString(),
        student_id: form.student_id,
        name: form.name,
        department: form.department,
        device_fingerprint: getDeviceFingerprint(),
      });
      setStatus("done");
      setMessage("REGISTRATION COMPLETE");
    } catch (e: any) {
      setStatus("error");
      setMessage(e.response?.data?.error || "REGISTRATION FAILED");
    }
  };

  if (!mounted) return null;

  return (
    <div className="max-w-md mx-auto flex flex-col gap-6 relative z-10">
      <div>
        <p className="text-xs text-[#2a2a2a] tracking-[0.2em] mb-2">SYSTEM :: REGISTRATION</p>
        <h1 className="font-display text-2xl font-black text-white tracking-[0.1em]">REGISTER IDENTITY</h1>
      </div>

      {!publicKey && (
        <div className="card p-4">
          <p className="text-xs text-[#444] tracking-[0.15em]">CONNECT WALLET TO PROCEED</p>
        </div>
      )}

      {existing && (
        <div className="card p-6 flex flex-col gap-0">
          <p className="text-xs text-[#2a2a2a] tracking-[0.2em] mb-4">REGISTERED IDENTITY</p>
          {[
            ["NAME",   existing.name],
            ["ID",     existing.student_id],
            ["DEPT",   existing.department],
            ["WALLET", publicKey?.toString().slice(0,28)+"..."],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-[#0f0f0f]">
              <span className="text-xs text-[#333] tracking-[0.1em]">{k}</span>
              <span className="text-xs text-white">{v}</span>
            </div>
          ))}
          <p className="text-xs text-[#222] tracking-[0.1em] mt-4">DEVICE FINGERPRINT BOUND</p>
        </div>
      )}

      {!existing && publicKey && (
        <div className="card p-6 flex flex-col gap-4">
          <input
            className="input px-4 py-3"
            placeholder="STUDENT_ID"
            value={form.student_id}
            onChange={(e) => setForm({...form, student_id: e.target.value})}
          />
          <input
            className="input px-4 py-3"
            placeholder="FULL_NAME"
            value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}
          />
          <select
            className="input px-4 py-3"
            value={form.department}
            onChange={(e) => setForm({...form, department: e.target.value})}
          >
            <option value="">SELECT_DEPARTMENT</option>
            {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <div className="border border-[#111] p-3">
            <p className="text-xs text-[#2a2a2a] leading-5 tracking-[0.08em]">
              YOUR DEVICE FINGERPRINT WILL BE BOUND TO THIS WALLET.
              ATTENDANCE CAN ONLY BE MARKED FROM THIS DEVICE.
            </p>
          </div>

          <button
            onClick={handle}
            disabled={status === "loading" || status === "done"}
            className="btn-primary py-3 text-xs tracking-[0.2em]"
          >
            {status === "loading" ? "REGISTERING..." : "REGISTER IDENTITY"}
          </button>

          {message && (
            <p className={`text-xs tracking-[0.1em] ${status === "error" ? "text-[#555]" : "text-white"}`}>
              {message}
            </p>
          )}
        </div>
      )}

      <div className="card p-5 flex flex-col gap-2">
        <p className="text-xs text-[#222] tracking-[0.15em] mb-1">BINDS</p>
        {[
          "Wallet address → Student ID (1:1)",
          "Device fingerprint → This browser",
          "All 7 anti-proxy layers activated",
        ].map((t, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-[#333]">—</span>
            <span className="text-xs text-[#333]">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}