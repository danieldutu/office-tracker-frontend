import { User, AttendanceRecord, AttendanceStats, OccupancyData, WeeklyPattern } from "@/types";

// Production API URL
const API_BASE = "https://office-tracker-backend-4zt3.vercel.app/api";

// Mock data for development
const mockUsers: User[] = [
  { id: "1", email: "john.doe@company.com", name: "John Doe", role: "admin", createdAt: "2025-01-01" },
  { id: "2", email: "jane.smith@company.com", name: "Jane Smith", role: "user", createdAt: "2025-01-01" },
];

const mockAttendance: AttendanceRecord[] = [];

// Auth
export const login = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Login failed");
  }

  const data = await res.json();
  setCurrentUser(data.user);
  return data;
};

export const logout = async () => {
  localStorage.removeItem("currentUser");
  return Promise.resolve();
};

export const getCurrentUser = async (): Promise<User | null> => {
  const stored = localStorage.getItem("currentUser");
  if (stored) {
    return JSON.parse(stored);
  }
  return null;
};

export const setCurrentUser = (user: User) => {
  localStorage.setItem("currentUser", JSON.stringify(user));
};

// Users
export const getUsers = async (): Promise<User[]> => {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
};

export const updateUser = async (id: string, data: Partial<User>): Promise<User> => {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
};

// Attendance
export const createAttendance = async (data: Omit<AttendanceRecord, "id" | "createdAt" | "updatedAt">): Promise<AttendanceRecord> => {
  const res = await fetch(`${API_BASE}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to create attendance");
  return res.json();
};

export const getAttendance = async (params?: {
  userId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}): Promise<AttendanceRecord[]> => {
  const queryParams = new URLSearchParams();
  if (params?.userId) queryParams.set("userId", params.userId);
  if (params?.startDate) queryParams.set("startDate", params.startDate);
  if (params?.endDate) queryParams.set("endDate", params.endDate);
  if (params?.status) queryParams.set("status", params.status);

  const url = `${API_BASE}/attendance${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) throw new Error("Failed to fetch attendance");
  return res.json();
};

// Analytics
export const getAnalyticsOverview = async (): Promise<AttendanceStats> => {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error("Failed to fetch analytics overview");
  return res.json();
};

export const getOccupancyData = async (startDate?: string, endDate?: string): Promise<OccupancyData[]> => {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);

  const url = `${API_BASE}/analytics/occupancy${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) throw new Error("Failed to fetch occupancy data");
  return res.json();
};

export const getWeeklyPattern = async (): Promise<WeeklyPattern[]> => {
  const res = await fetch(`${API_BASE}/analytics/weekly-pattern`);
  if (!res.ok) throw new Error("Failed to fetch weekly pattern");
  return res.json();
};
