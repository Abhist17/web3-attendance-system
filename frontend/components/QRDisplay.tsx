"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateQR, apiErrorMessage } from "@/lib/api";
import { Banner } from "@/components/ui";

export default function QRDisplay({ lectureId }: { lectureId: string }) {
  const [qrImage, setQrImage] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [windowClosesAt, setWindowClosesAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [lifetime, setLifetime] = useState(60);
  const [generation, setGeneration] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Guards against a slow response from a previous lecture overwriting the
  // current one after the prop changes.
  const requestRef = useRef(0);

  const fetchQR = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const data = await generateQR(lectureId);
      if (requestId !== requestRef.current) return;
      setQrImage(data.qr_image);
      setLifetime(data.expires_in);
      // Anchor the countdown to the payload's own timestamp so it reflects the
      // code's real remaining life rather than drifting with the render loop.
      setExpiresAt(data.payload.timestamp + data.expires_in);
      setWindowClosesAt(data.window_closes_at);
      setGeneration((g) => g + 1);
      setError("");
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setError(apiErrorMessage(err, "Could not generate a QR code"));
      setQrImage("");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [lectureId]);

  useEffect(() => {
    void fetchQR();
  }, [fetchQR]);

  // Single ticker: recomputes remaining time from the clock and refreshes the
  // code when it lapses. A plain `setCountdown(c => c - 1)` drifts and fires the
  // refetch twice under React strict mode.
  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      if (windowClosesAt && now > windowClosesAt) {
        setSecondsLeft(0);
        return;
      }
      const remaining = expiresAt - now;
      setSecondsLeft(Math.max(0, remaining));
      if (remaining <= 0 && !loading) void fetchQR();
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, windowClosesAt, loading, fetchQR]);

  const windowClosed = windowClosesAt > 0 && Math.floor(Date.now() / 1000) > windowClosesAt;
  const expiring = secondsLeft <= 15;
  const progress = lifetime > 0 ? Math.max(0, Math.min(1, secondsLeft / lifetime)) : 0;

  return (
    <section className="card flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="label">Live QR code</h2>
        <span className="text-xs text-fg-faint tabular-nums">
          #{generation.toString().padStart(3, "0")}
        </span>
      </div>

      <div className="flex aspect-square w-full items-center justify-center rounded-[3px] border border-ink-700 bg-white p-4">
        {windowClosed ? (
          <p className="text-center text-xs uppercase tracking-[0.15em] text-ink-600">
            Attendance window closed
          </p>
        ) : error ? (
          <p className="px-4 text-center text-xs leading-relaxed text-ink-700">{error}</p>
        ) : qrImage ? (
          <img
            src={qrImage}
            alt={`Attendance QR code for lecture ${lectureId}`}
            className="h-full w-full object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className="spinner h-6 w-6 border-ink-500 border-t-ink-900" />
        )}
      </div>

      {!windowClosed && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span
              className={`uppercase tracking-[0.15em] ${expiring ? "text-warn" : "text-fg-muted"}`}
            >
              {expiring ? "Refreshing soon" : "Active"}
            </span>
            <span className="tabular-nums text-fg-subtle">{secondsLeft}s</span>
          </div>
          <div
            className="h-px w-full bg-ink-700"
            role="progressbar"
            aria-valuenow={secondsLeft}
            aria-valuemin={0}
            aria-valuemax={lifetime}
            aria-label="Time until the QR code rotates"
          >
            <div
              className={`h-px transition-[width] duration-1000 ease-linear ${
                expiring ? "bg-warn" : "bg-fg"
              }`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-relaxed text-fg-faint">
          Rotates every {lifetime}s. A screenshot stops working once the code turns over.
        </p>
        <button
          type="button"
          onClick={() => void fetchQR()}
          disabled={loading || windowClosed}
          className="btn btn-ghost shrink-0 px-3 py-2"
        >
          {loading ? "…" : "New code"}
        </button>
      </div>

      {error && !windowClosed && <Banner tone="danger">{error}</Banner>}
    </section>
  );
}
