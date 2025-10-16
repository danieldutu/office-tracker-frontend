export type AttendanceStatus = "office" | "remote" | "absent";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "user" | "admin";
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceStats {
  totalUsers: number;
  averageOccupancy: number;
  mostPopularDay: string;
  remoteWorkRate: number;
}

export interface OccupancyData {
  date: string;
  count: number;
}

export interface WeeklyPattern {
  day: string;
  count: number;
}
