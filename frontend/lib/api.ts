import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

export const generateQR = (lectureId: string) =>
  API.get(`/qr/generate?lecture_id=${lectureId}`);

export const createLecture = (data: {
  lecture_id: string;
  subject: string;
  professor_wallet: string;
  start_time: number;
  deadline: number;
}) => API.post("/lecture/create", data);

export const getLectures = () => API.get("/lecture/list");

export const markAttendance = (data: {
  lecture_id: string;
  student_wallet: string;
  qr_payload: object;
  student_lat: number;
  student_lng: number;
}) => API.post("/attendance/mark", data);

export const getAttendance = (lectureId: string) =>
  API.get(`/attendance/list?lecture_id=${lectureId}`);