"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createLecture, getAttendance } from "@/lib/api";
import QRDisplay from "@/components/QRDisplay";

export default function ProfessorPage() {
  const { publicKey } = useWallet();
  const [form, setForm] = useState({
    lecture_id: "",
    subject: "",
    duration: "60",
  });
  const [activeLecture, setActiveLecture] = useState<string>("");
  const [attendance, setAttendance] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!publicKey) {
      setMessage("Please connect your wallet first");
      return;
    }
    if (!form.lecture_id || !form.subject) {
      setMessage("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      await createLecture({
        lecture_id: form.lecture_id,
        subject: form.subject,
        professor_wallet: publicKey.toString(),
        start_time: now,
        deadline: now + parseInt(form.duration) * 60,
      });
      setActiveLecture(form.lecture_id);
      setMessage(`✅ Lecture ${form.lecture_id} created!`);
    } catch (e: any) {
      setMessage(`❌ ${e.response?.data?.error || "Error creating lecture"}`);
    }
    setLoading(false);
  };

  const fetchAttendance = async () => {
    if (!activeLecture) return;
    const res = await getAttendance(activeLecture);
    setAttendance(res.data.records);
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold text-white">👨‍🏫 Professor Dashboard</h1>

      {!publicKey && (
        <div className="bg-yellow-900 border border-yellow-500 text-yellow-300 px-4 py-3 rounded-xl">
          ⚠️ Connect your wallet using the button in the top right
        </div>
      )}

      {/* Create Lecture */}
      <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-white text-xl font-semibold">Create Lecture</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            className="bg-gray-700 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Lecture ID (e.g. 101)"
            value={form.lecture_id}
            onChange={(e) => setForm({ ...form, lecture_id: e.target.value })}
          />
          <input
            className="bg-gray-700 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Subject (e.g. Blockchain)"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <select
            className="bg-gray-700 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          >
            <option value="10">10 min window</option>
            <option value="30">30 min window</option>
            <option value="60">60 min window</option>
          </select>
        </div>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition w-fit"
        >
          {loading ? "Creating..." : "🚀 Create & Generate QR"}
        </button>
        {message && (
          <p className="text-sm text-gray-300">{message}</p>
        )}
      </div>

      {/* QR Display */}
      {activeLecture && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QRDisplay lectureId={activeLecture} />
          <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-xl font-semibold">
                Attendance List
              </h2>
              <button
                onClick={fetchAttendance}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm transition"
              >
                🔄 Refresh
              </button>
            </div>
            {attendance.length === 0 ? (
              <p className="text-gray-500">No attendance yet</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {attendance.map((a, i) => (
                  <div
                    key={i}
                    className="bg-gray-700 rounded-xl px-4 py-2 text-sm"
                  >
                    <p className="text-green-400 font-mono truncate">
                      {a.student_wallet}
                    </p>
                    <p className="text-gray-400">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-auto bg-gray-700 rounded-xl px-4 py-3">
              <p className="text-white font-semibold">
                Total Present: {attendance.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}