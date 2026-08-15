"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  markAttendance,
  getStudent,
  apiErrorMessage,
  type AttendanceRecord,
  type QRPayload,
  type Student,
} from "@/lib/api";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import {
  useAttendanceProgram,
  markAttendanceOnChain,
  chainErrorMessage,
} from "@/lib/solana";
import {
  Banner,
  EmptyState,
  ExplorerLink,
  KeyValue,
  PageHeader,
  Panel,
  WalletGate,
  truncateAddress,
  useMounted,
} from "@/components/ui";

const QRScanner = dynamic(() => import("@/components/QRScanner"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-square w-full max-w-xs items-center justify-center rounded-[3px] border border-ink-700">
      <span className="spinner h-6 w-6" />
    </div>
  ),
});

type StepState = "pending" | "active" | "done" | "failed";

interface StepInfo {
  key: string;
  label: string;
  state: StepState;
}

const STEP_LABELS: [string, string][] = [
  ["scan", "Read QR code"],
  ["location", "Confirm your location"],
  ["device", "Check device binding"],
  ["chain", "Sign the on-chain record"],
  ["verify", "Server verification"],
];

type Phase = "idle" | "running" | "done" | "error";

export default function StudentPage() {
  const mounted = useMounted();
  const { publicKey } = useWallet();
  const program = useAttendanceProgram();

  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<{
    lecture_id: string;
    subject: string;
    timestamp: number;
    distance_meters: number | null;
    solana_tx: string | null;
  } | null>(null);

  const [profile, setProfile] = useState<Student | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!publicKey) {
      setProfile(null);
      setHistory([]);
      return;
    }
    setLoadingProfile(true);
    try {
      const result = await getStudent(publicKey.toString());
      setProfile(result?.student ?? null);
      setHistory(result?.attendance ?? []);
    } catch {
      // Non-fatal: the scan flow surfaces its own errors.
    } finally {
      setLoadingProfile(false);
    }
  }, [publicKey]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const initSteps = () =>
    setSteps(
      STEP_LABELS.map(([key, label], i) => ({
        key,
        label,
        state: i === 0 ? "active" : "pending",
      }))
    );

  const advance = (key: string, state: StepState, nextKey?: string) =>
    setSteps((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, state } : s.key === nextKey ? { ...s, state: "active" } : s
      )
    );

  const failCurrent = () =>
    setSteps((prev) => prev.map((s) => (s.state === "active" ? { ...s, state: "failed" } : s)));

  const handleScan = async (raw: string) => {
    if (!publicKey || !program) {
      setMessage("Connect your wallet first.");
      setPhase("error");
      return;
    }

    setPhase("running");
    setReceipt(null);
    setMessage("");
    initSteps();

    let payload: QRPayload;
    try {
      payload = JSON.parse(raw);
      if (!payload?.lecture_id || !payload?.signature) throw new Error("bad payload");
      advance("scan", "done", "location");
    } catch {
      failCurrent();
      setPhase("error");
      setMessage("That is not a valid attendance code. Scan the code shown by your lecturer.");
      return;
    }

    let position: GeolocationPosition;
    try {
      position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("This device cannot report a location."));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      advance("location", "done", "device");
    } catch {
      failCurrent();
      setPhase("error");
      setMessage(
        "Could not read your location. Allow location access in your browser and scan again."
      );
      return;
    }

    const fingerprint = getDeviceFingerprint();
    advance("device", "done", "chain");

    // The chain write comes before the server call so the recorded signature is
    // always real. If the student rejects it, nothing is written anywhere.
    let signature: string;
    try {
      signature = await markAttendanceOnChain(program, payload.lecture_id);
      advance("chain", "done", "verify");
    } catch (err) {
      failCurrent();
      setPhase("error");
      setMessage(chainErrorMessage(err, "The on-chain transaction failed"));
      return;
    }

    try {
      const result = await markAttendance({
        student_wallet: publicKey.toString(),
        qr_payload: payload,
        student_lat: position.coords.latitude,
        student_lng: position.coords.longitude,
        device_fingerprint: fingerprint,
        solana_tx: signature,
      });
      advance("verify", "done");
      setReceipt(result.record);
      setPhase("done");
      await loadProfile();
    } catch (err) {
      failCurrent();
      setPhase("error");
      setMessage(apiErrorMessage(err, "Verification failed"));
    }
  };

  const reset = () => {
    setPhase("idle");
    setSteps([]);
    setMessage("");
    setReceipt(null);
  };

  if (!mounted) return null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader
        eyebrow="Student"
        title="Mark attendance"
        description="Scan the code your lecturer is projecting. It rotates every minute, so a screenshot will not work."
      />

      {!publicKey ? (
        <WalletGate message="Connect the wallet you registered with to mark attendance." />
      ) : (
        <>
          <Panel>
            <div className="flex flex-col">
              <KeyValue label="Wallet">{truncateAddress(publicKey.toString(), 8, 8)}</KeyValue>
              <KeyValue label="Student">
                {loadingProfile ? "Checking…" : (profile?.name ?? "Not registered")}
              </KeyValue>
            </div>
            {!loadingProfile && !profile && (
              <Banner tone="warn">
                This wallet is not registered. Visit the Register page first — attendance from an
                unregistered wallet is rejected.
              </Banner>
            )}
          </Panel>

          <Panel title={phase === "idle" ? "Scan code" : "Verification"}>
            {phase === "idle" && <QRScanner onScan={handleScan} />}

            {phase !== "idle" && (
              <ol className="flex flex-col gap-3">
                {steps.map((step) => (
                  <li key={step.key} className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={`flex h-4 w-4 shrink-0 items-center justify-center text-xs ${
                        step.state === "done"
                          ? "text-ok"
                          : step.state === "failed"
                            ? "text-danger"
                            : step.state === "active"
                              ? "text-fg"
                              : "text-fg-faint"
                      }`}
                    >
                      {step.state === "done"
                        ? "✓"
                        : step.state === "failed"
                          ? "✕"
                          : step.state === "active"
                            ? "•"
                            : "·"}
                    </span>
                    <span
                      className={`text-sm ${
                        step.state === "pending" ? "text-fg-faint" : "text-fg-muted"
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.state === "active" && phase === "running" && (
                      <span className="spinner ml-auto h-3 w-3" />
                    )}
                  </li>
                ))}
              </ol>
            )}

            {phase === "done" && receipt && (
              <div className="fade-up flex flex-col gap-4 border-t border-ink-800 pt-5">
                <p className="font-display text-xl font-black tracking-[0.08em] text-ok">
                  Attendance confirmed
                </p>
                <div className="flex flex-col">
                  <KeyValue label="Lecture">
                    {receipt.subject} · {receipt.lecture_id}
                  </KeyValue>
                  <KeyValue label="Time">
                    {new Date(receipt.timestamp * 1000).toLocaleString()}
                  </KeyValue>
                  {receipt.distance_meters !== null && (
                    <KeyValue label="Distance">{receipt.distance_meters}m from class</KeyValue>
                  )}
                  {receipt.solana_tx && (
                    <KeyValue label="On-chain">
                      <ExplorerLink signature={receipt.solana_tx} />
                    </KeyValue>
                  )}
                </div>
                <button onClick={reset} className="btn btn-ghost py-3">
                  Done
                </button>
              </div>
            )}

            {phase === "error" && (
              <div className="fade-up flex flex-col gap-4 border-t border-ink-800 pt-5">
                <p className="font-display text-xl font-black tracking-[0.08em] text-danger">
                  Not recorded
                </p>
                <Banner tone="danger">{message}</Banner>
                <button onClick={reset} className="btn btn-primary py-3">
                  Try again
                </button>
              </div>
            )}
          </Panel>

          <Panel title="Your attendance">
            {history.length === 0 ? (
              <EmptyState>No attendance recorded yet</EmptyState>
            ) : (
              <ul className="flex flex-col">
                {history.map((record) => (
                  <li
                    key={`${record.lecture_id}-${record.timestamp}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink-800 py-3 last:border-0"
                  >
                    <span className="flex flex-wrap items-baseline gap-x-3">
                      <span className="text-sm text-fg">{record.lecture_id}</span>
                      {record.subject && (
                        <span className="text-xs text-fg-muted">{record.subject}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-3">
                      {record.solana_tx && <ExplorerLink signature={record.solana_tx} />}
                      <span className="text-xs tabular-nums text-fg-subtle">
                        {new Date(record.timestamp * 1000).toLocaleDateString()}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
