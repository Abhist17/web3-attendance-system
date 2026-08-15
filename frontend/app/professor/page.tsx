"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  createLecture,
  getAttendance,
  getLectures,
  apiErrorMessage,
  type Lecture,
  type RosterEntry,
} from "@/lib/api";
import {
  useAttendanceProgram,
  createLectureOnChain,
  isLectureOnChain,
  chainErrorMessage,
  MAX_LECTURE_ID_LEN,
} from "@/lib/solana";
import {
  Banner,
  EmptyState,
  ExplorerLink,
  Field,
  PageHeader,
  Panel,
  WalletGate,
  truncateAddress,
  useMounted,
} from "@/components/ui";

const QRDisplay = dynamic(() => import("@/components/QRDisplay"), {
  ssr: false,
  loading: () => (
    <div className="card flex aspect-square items-center justify-center p-6">
      <span className="spinner h-6 w-6" />
    </div>
  ),
});

const DURATIONS = [
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "60 minutes" },
];

type Step = "idle" | "signing" | "saving";

export default function ProfessorPage() {
  const mounted = useMounted();
  const { publicKey } = useWallet();
  const program = useAttendanceProgram();

  const [form, setForm] = useState({
    lecture_id: "",
    subject: "",
    duration: "10",
    lat: "",
    lng: "",
  });
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [locating, setLocating] = useState(false);

  const [activeLecture, setActiveLecture] = useState("");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);

  const loadLectures = useCallback(async () => {
    if (!publicKey) return;
    try {
      setLectures(await getLectures(publicKey.toString()));
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load your lectures"));
    }
  }, [publicKey]);

  useEffect(() => {
    void loadLectures();
  }, [loadLectures]);

  const loadRoster = useCallback(async (lectureId: string) => {
    if (!lectureId) return;
    try {
      setRoster(await getAttendance(lectureId));
    } catch {
      // A transient roster fetch failure shouldn't clobber the page; the next
      // poll will pick it up.
    }
  }, []);

  // Live roster: the professor should see students appear without clicking.
  useEffect(() => {
    if (!activeLecture) return;
    void loadRoster(activeLecture);
    const id = setInterval(() => void loadRoster(activeLecture), 5000);
    return () => clearInterval(id);
  }, [activeLecture, loadRoster]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("This browser cannot report a location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        setError("Could not read your location. Allow location access and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !program) return;

    const lectureId = form.lecture_id.trim();
    const subject = form.subject.trim();
    if (!lectureId || !subject) {
      setError("A lecture ID and subject are required.");
      return;
    }
    if (lectureId.length > MAX_LECTURE_ID_LEN) {
      setError(`Lecture ID must be at most ${MAX_LECTURE_ID_LEN} characters.`);
      return;
    }

    setError("");
    setNotice("");

    const startTime = Math.floor(Date.now() / 1000);
    const deadline = startTime + parseInt(form.duration, 10) * 60;
    let tx = "";

    try {
      if (await isLectureOnChain(program, lectureId)) {
        setError(`Lecture "${lectureId}" already exists on-chain. Pick a different ID.`);
        return;
      }
      setStep("signing");
      tx = await createLectureOnChain(program, { lectureId, subject, startTime, deadline });
    } catch (err) {
      setStep("idle");
      setError(chainErrorMessage(err, "Could not create the lecture on-chain"));
      return;
    }

    try {
      setStep("saving");
      await createLecture({
        lecture_id: lectureId,
        subject,
        professor_wallet: publicKey.toString(),
        start_time: startTime,
        deadline,
        classroom_lat: form.lat ? parseFloat(form.lat) : undefined,
        classroom_lng: form.lng ? parseFloat(form.lng) : undefined,
        solana_tx: tx,
      });
      setActiveLecture(lectureId);
      setRoster([]);
      setNotice(`Lecture ${lectureId} is live. Project the QR code for your class.`);
      setForm({ lecture_id: "", subject: "", duration: "10", lat: "", lng: "" });
      await loadLectures();
    } catch (err) {
      setError(apiErrorMessage(err, "Lecture created on-chain, but saving it locally failed"));
    } finally {
      setStep("idle");
    }
  };

  const busy = step !== "idle";
  const activeMeta = lectures.find((l) => l.lecture_id === activeLecture);

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Professor"
        title="Lecture control"
        description="Create a lecture, project the rotating QR code, and watch attendance land in real time."
      />

      {!publicKey ? (
        <WalletGate message="Connect the wallet you want to own these lectures. It signs the on-chain record." />
      ) : (
        <>
          <form onSubmit={submit}>
            <Panel title="New lecture">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Lecture ID" hint="Used as the on-chain address. Must be unique.">
                  <input
                    className="input"
                    placeholder="e.g. CS101-W3"
                    maxLength={MAX_LECTURE_ID_LEN}
                    value={form.lecture_id}
                    onChange={(e) => setForm({ ...form, lecture_id: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Subject">
                  <input
                    className="input"
                    placeholder="e.g. Distributed Systems"
                    maxLength={100}
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Attendance window">
                  <select
                    className="input"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  >
                    {DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Classroom location"
                  hint="Optional. When set, students must be within range to check in."
                >
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={locating}
                    className="input text-left"
                  >
                    {locating
                      ? "Locating…"
                      : form.lat
                        ? `${form.lat}, ${form.lng}`
                        : "Use my current location"}
                  </button>
                </Field>
              </div>

              <button type="submit" disabled={busy} className="btn btn-primary py-3 sm:self-start sm:px-8">
                {step === "signing"
                  ? "Confirm in your wallet…"
                  : step === "saving"
                    ? "Saving…"
                    : "Create lecture"}
              </button>

              {notice && <Banner tone="ok">{notice}</Banner>}
              {error && <Banner tone="danger">{error}</Banner>}
            </Panel>
          </form>

          {activeLecture && (
            <div className="grid gap-6 lg:grid-cols-2">
              <QRDisplay lectureId={activeLecture} />

              <Panel
                title={`Attendance · ${activeLecture}`}
                action={
                  <span className="text-xs text-fg-faint">
                    Live · updates every 5s
                  </span>
                }
              >
                {activeMeta && (
                  <p className="text-xs text-fg-muted">
                    {activeMeta.subject} · window closes{" "}
                    {new Date(activeMeta.deadline * 1000).toLocaleTimeString()}
                    {activeMeta.classroom_lat === null && " · no geofence"}
                  </p>
                )}

                <div className="-mx-2 max-h-72 flex-1 overflow-y-auto">
                  {roster.length === 0 ? (
                    <EmptyState>Waiting for students…</EmptyState>
                  ) : (
                    <ul className="flex flex-col">
                      {roster.map((entry) => (
                        <li
                          key={entry.id}
                          className="fade-up border-b border-ink-800 px-2 py-3 last:border-0"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm text-fg">{entry.name ?? "Unknown"}</span>
                            <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                              {new Date(entry.timestamp * 1000).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text-xs text-fg-muted">
                              {entry.student_id ?? "—"}
                            </span>
                            <span className="text-xs text-fg-faint">
                              {truncateAddress(entry.student_wallet)}
                            </span>
                            {entry.distance_meters !== null && (
                              <span className="text-xs text-fg-faint">
                                {entry.distance_meters}m away
                              </span>
                            )}
                            {entry.solana_tx && <ExplorerLink signature={entry.solana_tx} />}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-baseline justify-between border-t border-ink-800 pt-4">
                  <span className="label">Present</span>
                  <span className="font-display text-2xl text-fg tabular-nums">
                    {roster.length}
                  </span>
                </div>
              </Panel>
            </div>
          )}

          <Panel title="Your lectures">
            {lectures.length === 0 ? (
              <EmptyState>No lectures yet</EmptyState>
            ) : (
              <ul className="flex flex-col">
                {lectures.map((lecture) => {
                  const isOpen = Math.floor(Date.now() / 1000) <= lecture.deadline;
                  const isActive = lecture.lecture_id === activeLecture;
                  return (
                    <li key={lecture.id}>
                      <button
                        type="button"
                        onClick={() => setActiveLecture(lecture.lecture_id)}
                        aria-pressed={isActive}
                        className={`flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-ink-800 px-2 py-3 text-left transition-colors hover:bg-ink-850 ${
                          isActive ? "bg-ink-850" : ""
                        }`}
                      >
                        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="text-sm text-fg">{lecture.lecture_id}</span>
                          <span className="text-xs text-fg-muted">{lecture.subject}</span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-xs text-fg-subtle tabular-nums">
                            {lecture.attendance_count} present
                          </span>
                          <span
                            className={`text-xs uppercase tracking-[0.12em] ${
                              isOpen ? "text-ok" : "text-fg-faint"
                            }`}
                          >
                            {isOpen ? "Open" : "Closed"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
