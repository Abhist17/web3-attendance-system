"use client";
import { useEffect, useState } from "react";
import { generateQR } from "@/lib/api";

export default function QRDisplay({ lectureId }: { lectureId: string }) {
  const [qrImage, setQrImage] = useState<string>("");
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);

  const fetchQR = async () => {
    setLoading(true);
    try {
      const res = await generateQR(lectureId);
      setQrImage(res.data.qr_image);
      setCountdown(60);
    } catch {
      console.error("QR fetch failed");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQR();
  }, [lectureId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchQR();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lectureId]);

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-800 rounded-2xl">
      <h3 className="text-white font-semibold text-lg">
        Live QR — Lecture {lectureId}
      </h3>
      {loading ? (
        <div className="w-64 h-64 bg-gray-700 rounded-xl animate-pulse" />
      ) : (
        qrImage && (
          <img
            src={qrImage}
            alt="QR Code"
            className="w-64 h-64 rounded-xl border-4 border-purple-500"
          />
        )
      )}
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            countdown > 15 ? "bg-green-400" : "bg-red-400"
          } animate-pulse`}
        />
        <span className="text-gray-300 text-sm">
          Refreshes in {countdown}s
        </span>
      </div>
    </div>
  );
}