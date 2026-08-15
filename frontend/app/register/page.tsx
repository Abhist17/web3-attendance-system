"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  registerStudent,
  getStudent,
  apiErrorMessage,
  type Student,
} from "@/lib/api";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import {
  useAttendanceProgram,
  isStudentRegisteredOnChain,
  registerStudentOnChain,
  chainErrorMessage,
  MAX_STUDENT_ID_LEN,
} from "@/lib/solana";
import {
  Banner,
  ExplorerLink,
  Field,
  KeyValue,
  PageHeader,
  Panel,
  WalletGate,
  useMounted,
} from "@/components/ui";

const DEPARTMENTS = [
  "Computer Science",
  "Electronics",
  "Mechanical",
  "Civil",
  "Mathematics",
  "Physics",
];

type Step = "idle" | "signing" | "saving" | "done";

export default function RegisterPage() {
  const mounted = useMounted();
  const { publicKey } = useWallet();
  const program = useAttendanceProgram();

  const [form, setForm] = useState({ student_id: "", name: "", department: "" });
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const [existing, setExisting] = useState<Student | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!publicKey) {
      setExisting(null);
      return;
    }
    setLoadingProfile(true);
    try {
      const result = await getStudent(publicKey.toString());
      setExisting(result?.student ?? null);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load your profile"));
    } finally {
      setLoadingProfile(false);
    }
  }, [publicKey]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !program) return;

    const studentId = form.student_id.trim();
    const name = form.name.trim();
    if (!studentId || !name || !form.department) {
      setError("Fill in every field before registering.");
      return;
    }
    if (studentId.length > MAX_STUDENT_ID_LEN) {
      setError(`Student ID must be at most ${MAX_STUDENT_ID_LEN} characters.`);
      return;
    }

    setError("");
    let tx = "";

    try {
      // The profile PDA may already exist from a previous attempt that failed
      // after the transaction landed; re-sending it would just error out.
      const alreadyOnChain = await isStudentRegisteredOnChain(program, publicKey);
      if (!alreadyOnChain) {
        setStep("signing");
        tx = await registerStudentOnChain(program, {
          studentId,
          name,
          department: form.department,
        });
        setSignature(tx);
      }
    } catch (err) {
      setStep("idle");
      setError(chainErrorMessage(err, "Could not write your profile on-chain"));
      return;
    }

    try {
      setStep("saving");
      await registerStudent({
        wallet: publicKey.toString(),
        student_id: studentId,
        name,
        department: form.department,
        device_fingerprint: getDeviceFingerprint(),
        solana_tx: tx || undefined,
      });
      setStep("done");
      await loadProfile();
    } catch (err) {
      setStep("idle");
      setError(apiErrorMessage(err, "On-chain profile created, but saving it locally failed"));
    }
  };

  const busy = step === "signing" || step === "saving";

  if (!mounted) return null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader
        eyebrow="Registration"
        title="Register your identity"
        description="Binds your wallet to a student record on-chain and to this device. You will need a small amount of devnet SOL for the transaction fee."
      />

      {!publicKey ? (
        <WalletGate message="Connect a Solana wallet to create your student profile." />
      ) : existing ? (
        <Panel title="Registered">
          <div className="flex flex-col">
            <KeyValue label="Name">{existing.name}</KeyValue>
            <KeyValue label="Student ID">{existing.student_id}</KeyValue>
            <KeyValue label="Department">{existing.department}</KeyValue>
            <KeyValue label="Wallet">{existing.wallet}</KeyValue>
            <KeyValue label="Device">
              {existing.device_bound ? "Bound to this account" : "Not bound"}
            </KeyValue>
            {existing.solana_tx && (
              <KeyValue label="On-chain">
                <ExplorerLink signature={existing.solana_tx} />
              </KeyValue>
            )}
          </div>
          <Banner tone="ok">
            You are ready to mark attendance. Head to the Student page when your lecturer displays
            a code.
          </Banner>
        </Panel>
      ) : loadingProfile ? (
        <Panel>
          <div className="flex items-center gap-3 py-4">
            <span className="spinner h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.15em] text-fg-muted">
              Checking registration…
            </span>
          </div>
        </Panel>
      ) : (
        <form onSubmit={submit}>
          <Panel title="Student details">
            <Field label="Student ID" hint={`Max ${MAX_STUDENT_ID_LEN} characters.`}>
              <input
                className="input"
                value={form.student_id}
                maxLength={MAX_STUDENT_ID_LEN}
                placeholder="e.g. 21BCE1043"
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                required
              />
            </Field>

            <Field label="Full name">
              <input
                className="input"
                value={form.name}
                maxLength={64}
                placeholder="e.g. Abhishek Sharma"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>

            <Field label="Department">
              <select
                className="input"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
              >
                <option value="">Select a department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>

            <Banner tone="info">
              Registering signs one transaction on Solana devnet and binds this browser as your
              attendance device. Marking attendance from a different device will be rejected.
            </Banner>

            <button type="submit" disabled={busy} className="btn btn-primary py-3">
              {step === "signing"
                ? "Confirm in your wallet…"
                : step === "saving"
                  ? "Saving…"
                  : "Register identity"}
            </button>

            {signature && step !== "done" && (
              <p className="text-xs text-fg-muted">
                Transaction sent: <ExplorerLink signature={signature} />
              </p>
            )}

            {error && <Banner tone="danger">{error}</Banner>}
          </Panel>
        </form>
      )}
    </div>
  );
}
