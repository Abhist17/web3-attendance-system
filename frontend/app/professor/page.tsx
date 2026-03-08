"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createLecture, getAttendance, getLectures } from "@/lib/api";
import dynamic from "next/dynamic";

const QRDisplay = dynamic(() => import("@/components/QRDisplay"), { ssr: false });

export default function ProfessorPage() {
  const { publicKey } = useWallet();
  const [mounted, setMounted]         = useState(false);
  const [form, setForm]               = useState({ lecture_id:"", subject:"", duration:"10", lat:"", lng:"" });
  const [activeLecture, setActive]    = useState("");
  const [attendance, setAttendance]   = useState<any[]>([]);
  const [lectures, setLectures]       = useState<any[]>([]);
  const [message, setMessage]         = useState("");
  const [loading, setLoading]         = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    getLectures().then((r) => setLectures(r.data.lectures)).catch(() => {});
  }, [activeLecture]);

  const useLocation = () => {
    navigator.geolocation.getCurrentPosition((p) =>
      setForm((f) => ({ ...f, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }))
    );
  };

  const create = async () => {
    if (!publicKey) return setMessage("CONNECT WALLET FIRST");
    if (!form.lecture_id || !form.subject) return setMessage("FILL REQUIRED FIELDS");
    setLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      await createLecture({
        lecture_id: form.lecture_id, subject: form.subject,
        professor_wallet: publicKey.toString(),
        start_time: now, deadline: now + parseInt(form.duration) * 60,
        classroom_lat: form.lat ? parseFloat(form.lat) : undefined,
        classroom_lng: form.lng ? parseFloat(form.lng) : undefined,
      });
      setActive(form.lecture_id);
      setMessage("LECTURE CREATED — QR STREAM ACTIVE");
    } catch (e: any) {
      setMessage(e.response?.data?.error || "ERROR");
    }
    setLoading(false);
  };

  const refresh = async () => {
    if (!activeLecture) return;
    const r = await getAttendance(activeLecture);
    setAttendance(r.data.records);
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6 relative z-10">
      <div>
        <p className="text-xs text-[#2a2a2a] tracking-[0.2em] mb-2">SYSTEM :: PROFESSOR</p>
        <h1 className="font-display text-2xl font-black text-white tracking-[0.1em]">LECTURE CONTROL</h1>
      </div>

      {!publicKey && (
        <div className="card p-4">
          <p className="text-xs text-[#444] tracking-[0.15em]">CONNECT WALLET TO PROCEED</p>
        </div>
      )}

      {/* Create form */}
      <div className="card p-6 flex flex-col gap-4">
        <p className="text-xs text-[#2a2a2a] tracking-[0.2em]">CREATE_LECTURE</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input px-4 py-3" placeholder="LECTURE_ID (e.g. CS101)" value={form.lecture_id} onChange={(e)=>setForm({...form,lecture_id:e.target.value})} />
          <input className="input px-4 py-3" placeholder="SUBJECT" value={form.subject} onChange={(e)=>setForm({...form,subject:e.target.value})} />
          <select className="input px-4 py-3" value={form.duration} onChange={(e)=>setForm({...form,duration:e.target.value})}>
            <option value="5">5 MIN WINDOW</option>
            <option value="10">10 MIN WINDOW</option>
            <option value="30">30 MIN WINDOW</option>
            <option value="60">60 MIN WINDOW</option>
          </select>
          <button onClick={useLocation} className="input px-4 py-3 text-left hover:border-[#444] transition cursor-pointer">
            {form.lat ? `${form.lat}, ${form.lng}` : "USE MY LOCATION (CLASSROOM)"}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={create} disabled={loading || !publicKey} className="btn-primary px-8 py-3 text-xs tracking-[0.15em]">
            {loading ? "CREATING..." : "CREATE LECTURE"}
          </button>
          {message && <p className="text-xs text-[#555] tracking-[0.1em]">{message}</p>}
        </div>
      </div>

      {/* Active QR + attendance */}
      {activeLecture && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QRDisplay lectureId={activeLecture} />
          <div className="card p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-[#2a2a2a] tracking-[0.2em]">ATTENDANCE_LOG</p>
              <button onClick={refresh} className="text-xs text-[#333] hover:text-white transition tracking-[0.1em]">
                REFRESH
              </button>
            </div>
            <div className="flex flex-col gap-0 overflow-y-auto max-h-56 flex-1">
              {attendance.length === 0 ? (
                <p className="text-xs text-[#1e1e1e] tracking-[0.1em]">AWAITING ENTRIES...</p>
              ) : attendance.map((a, i) => (
                <div key={i} className="py-2 border-b border-[#0d0d0d]">
                  <p className="text-xs text-white">{a.name || "UNKNOWN"} · {a.student_id || "N/A"}</p>
                  <p className="text-xs text-[#333] truncate mt-0.5">{a.student_wallet}</p>
                  <p className="text-xs text-[#222] mt-0.5">{new Date(a.timestamp*1000).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-3 border-t border-[#111]">
              <span className="text-xs text-[#333] tracking-[0.1em]">TOTAL PRESENT</span>
              <span className="font-display text-xl text-white">{attendance.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {lectures.length > 0 && (
        <div className="card p-6">
          <p className="text-xs text-[#2a2a2a] tracking-[0.2em] mb-4">LECTURE_HISTORY</p>
          <div className="flex flex-col gap-0">
            {lectures.map((l) => (
              <div
                key={l.id}
                className="flex justify-between py-3 border-b border-[#0d0d0d] cursor-pointer hover:bg-[#0a0a0a] px-2 transition-colors"
                onClick={() => { setActive(l.lecture_id); refresh(); }}
              >
                <div className="flex gap-6">
                  <span className="text-xs text-white">{l.lecture_id}</span>
                  <span className="text-xs text-[#333]">{l.subject}</span>
                </div>
                <span className="text-xs text-[#222]">{new Date(l.start_time*1000).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}