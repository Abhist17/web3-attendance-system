"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface Props {
  onScan: (data: string) => void;
}

export default function QRScanner({ onScan }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          onScan(text);
          stopScanner();
        },
        () => {}
      );
      setActive(true);
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && active) {
      await scannerRef.current.stop();
      setActive(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        id="qr-reader"
        className="w-72 h-72 bg-gray-800 rounded-xl overflow-hidden"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!active ? (
        <button
          onClick={startScanner}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl transition"
        >
          📷 Start Scanner
        </button>
      ) : (
        <button
          onClick={stopScanner}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl transition"
        >
          ⏹ Stop Scanner
        </button>
      )}
    </div>
  );
}