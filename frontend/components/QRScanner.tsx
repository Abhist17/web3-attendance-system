"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { Banner } from "@/components/ui";

const REGION_ID = "qr-reader-region";

export default function QRScanner({ onScan }: { onScan: (raw: string) => void }) {
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState(false);
  const [manualValue, setManualValue] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  // The scan callback fires repeatedly while the code is in frame; latch so the
  // parent is only told once.
  const handledRef = useRef(false);

  const stop = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      // Already torn down (e.g. the element unmounted first) — nothing to do.
    }
  };

  // Stop the camera when the component goes away, otherwise the device light
  // stays on after navigating.
  useEffect(() => {
    return () => {
      void stop();
    };
  }, []);

  const start = async () => {
    setError("");
    setStarting(true);
    handledRef.current = false;
    try {
      const { Html5Qrcode: Scanner } = await import("html5-qrcode");
      const scanner = new Scanner(REGION_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          if (handledRef.current) return;
          handledRef.current = true;
          void stop().then(() => {
            setActive(false);
            onScan(text);
          });
        },
        () => {
          // Fires on every frame without a readable code; not an error.
        }
      );
      setActive(true);
    } catch (err) {
      scannerRef.current = null;
      const message =
        err instanceof Error && /permission|denied|notallowed/i.test(err.message)
          ? "Camera permission denied. Allow camera access in your browser, or paste the code manually."
          : "Could not start the camera. It may be in use by another app, or unavailable on this device.";
      setError(message);
      setManual(true);
    } finally {
      setStarting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = manualValue.trim();
    if (!value) return;
    onScan(value);
  };

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div
        id={REGION_ID}
        className="relative flex aspect-square w-full max-w-xs items-center justify-center overflow-hidden rounded-[3px] border border-ink-700 bg-ink-950"
      >
        {!active && !starting && (
          <span className="text-xs uppercase tracking-[0.15em] text-fg-faint">Camera off</span>
        )}
        {starting && <div className="spinner h-6 w-6" />}
        {active && (
          <>
            <span className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l border-t border-fg" />
            <span className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r border-t border-fg" />
            <span className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b border-l border-fg" />
            <span className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b border-r border-fg" />
          </>
        )}
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {active ? (
          <button
            type="button"
            onClick={() => void stop().then(() => setActive(false))}
            className="btn btn-ghost px-6 py-3"
          >
            Stop camera
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            disabled={starting}
            className="btn btn-primary px-6 py-3"
          >
            {starting ? "Starting…" : "Start camera"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setManual((m) => !m)}
          className="btn btn-ghost px-4 py-3"
        >
          {manual ? "Hide manual entry" : "Enter code manually"}
        </button>
      </div>

      {manual && (
        <form onSubmit={handleManualSubmit} className="flex w-full flex-col gap-2">
          <label className="label" htmlFor="manual-qr">
            Paste QR payload
          </label>
          <textarea
            id="manual-qr"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            rows={3}
            placeholder='{"lecture_id":"CS101","nonce":"…","timestamp":…,"signature":"…"}'
            className="input resize-y font-mono"
          />
          <button type="submit" disabled={!manualValue.trim()} className="btn btn-primary py-3">
            Submit code
          </button>
          <p className="text-xs leading-relaxed text-fg-faint">
            For testing on a desktop without a camera. The payload is shown by the backend at
            <code className="mx-1 text-fg-subtle">/api/qr/generate</code>.
          </p>
        </form>
      )}
    </div>
  );
}
