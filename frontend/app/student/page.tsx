"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { markAttendance } from "@/lib/api";
import QRScanner from "@/components/QRScanner";

export default function StudentPage() {
  const { publicKey } = useWallet();
  const [status, setStatus] = useState<"idle" | "scanning" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [scannedLecture, setScannedLecture] = useState("");

  const handleScan = async (rawData: string) => {
    if (!publicKey) {
      setMessage("❌ Connect your wallet first");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setMessage("📍 Getting location...");

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject)
      );

      const payload = JSON.parse(rawData);
      setScannedLecture(payload.lecture_id);
      setMessage("🔗 Submitting to backend...");

      await markAttendance({
        lecture_id: payload.lecture_id,
        student_wallet: publicKey.toString(),
        qr_payload: payload,
        student_lat: position.coords.latitude,
        student_lng: position.coords.longitude,
      });

      setStatus("done");
      setMessage(`✅ Attendance marked for Lecture ${payload.lecture_id}!`);
    } catch (e: any) {
      setStatus("error");
      setMessage(`❌ ${e.response?.data?.error || e.message || "Failed"}`);
    }
  };

  const reset = () => {
    setStatus("idle");
    setMessage("");
    setScannedLecture("");
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold text-white">🎒 Student Dashboard</h1>

      {!publicKey && (
        <div className="bg-yellow-900 border border-yellow-500 text-yellow-300 px-4 py-3 rounded-xl">
          ⚠️ Connect your wallet using the button in the top right
        </div>
      )}

      {publicKey && (
        <div className="bg-gray-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
          <p className="text-gray-300 text-sm font-mono">
            {publicKey.toString()}
          </p>
        </div>
      )}

      <div className="bg-gray-800 rounded-2xl p-6 flex flex-col items-center gap-6">
        <h2 className="text-white text-xl font-semibold self-start">
          Scan Lecture QR Code
        </h2>

        {status === "idle" && (
          <QRScanner onScan={handleScan} />
        )}

        {status === "submitting" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-300">{message}</p>
          </div>
        )}

        {status === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="text-6xl">✅</div>
            <p className="text-green-400 text-xl font-semibold">{message}</p>
            <p className="text-gray-400 text-sm">
              Lecture ID: {scannedLecture}
            </p>
            <button
              onClick={reset}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl transition"
            >
              Scan Another
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="text-6xl">❌</div>
            <p className="text-red-400 text-lg text-center">{message}</p>
            <button
              onClick={reset}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-xl transition"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { icon: "🔐", label: "Wallet Verified" },
          { icon: "📍", label: "Location Checked" },
          { icon: "⛓️", label: "On-Chain Record" },
        ].map((item) => (
          <div key={item.label} className="bg-gray-800 rounded-2xl p-4">
            <div className="text-3xl mb-2">{item.icon}</div>
            <p className="text-gray-400 text-sm">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}