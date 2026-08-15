import axios, { AxiosError } from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api",
  timeout: 15000,
});

/** Pulls the server's message out of an axios error, with sane fallbacks. */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{ error?: string }>;
    const serverMessage = axiosErr.response?.data?.error;
    if (serverMessage) return serverMessage;
    if (axiosErr.code === "ECONNABORTED") return "Request timed out — is the backend running?";
    if (!axiosErr.response) return "Cannot reach the backend — is it running on port 5000?";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export interface Student {
  wallet: string;
  student_id: string;
  name: string;
  department: string;
  registered_at: number;
  device_bound: boolean;
  solana_tx: string | null;
}

export interface AttendanceRecord {
  lecture_id: string;
  subject: string | null;
  timestamp: number;
  solana_tx: string | null;
  distance_meters: number | null;
}

export interface Lecture {
  id: number;
  lecture_id: string;
  subject: string;
  professor_wallet: string;
  classroom_lat: number | null;
  classroom_lng: number | null;
  start_time: number;
  deadline: number;
  solana_tx: string | null;
  created_at: number;
  attendance_count: number;
}

export interface RosterEntry {
  id: number;
  student_wallet: string;
  lecture_id: string;
  timestamp: number;
  distance_meters: number | null;
  solana_tx: string | null;
  name: string | null;
  student_id: string | null;
  department: string | null;
}

export interface QRPayload {
  lecture_id: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

export async function generateQR(lectureId: string) {
  const { data } = await API.get<{
    success: boolean;
    qr_image: string;
    payload: QRPayload;
    expires_in: number;
    window_closes_at: number;
  }>("/qr/generate", { params: { lecture_id: lectureId } });
  return data;
}

export async function createLecture(payload: {
  lecture_id: string;
  subject: string;
  professor_wallet: string;
  start_time: number;
  deadline: number;
  classroom_lat?: number;
  classroom_lng?: number;
  solana_tx?: string;
}) {
  const { data } = await API.post<{ success: boolean; lecture_id: string }>(
    "/lecture/create",
    payload
  );
  return data;
}

export async function getLectures(professorWallet?: string) {
  const { data } = await API.get<{ success: boolean; lectures: Lecture[] }>("/lecture/list", {
    params: professorWallet ? { professor_wallet: professorWallet } : undefined,
  });
  return data.lectures;
}

export async function registerStudent(payload: {
  wallet: string;
  student_id: string;
  name: string;
  department: string;
  device_fingerprint: string;
  solana_tx?: string;
}) {
  const { data } = await API.post<{ success: boolean }>("/student/register", payload);
  return data;
}

/** Resolves to null when the wallet has not registered yet (404). */
export async function getStudent(
  wallet: string
): Promise<{ student: Student; attendance: AttendanceRecord[] } | null> {
  try {
    const { data } = await API.get<{
      success: boolean;
      student: Student;
      attendance: AttendanceRecord[];
    }>(`/student/${wallet}`);
    return { student: data.student, attendance: data.attendance };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

export async function markAttendance(payload: {
  student_wallet: string;
  qr_payload: QRPayload;
  student_lat: number;
  student_lng: number;
  device_fingerprint: string;
  solana_tx?: string;
}) {
  const { data } = await API.post<{
    success: boolean;
    message: string;
    record: {
      lecture_id: string;
      subject: string;
      timestamp: number;
      distance_meters: number | null;
      solana_tx: string | null;
    };
  }>("/attendance/mark", payload);
  return data;
}

export async function getAttendance(lectureId: string) {
  const { data } = await API.get<{ success: boolean; records: RosterEntry[] }>(
    "/attendance/list",
    { params: { lecture_id: lectureId } }
  );
  return data.records;
}
