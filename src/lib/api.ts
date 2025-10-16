import { User, AttendanceRecord, AttendanceStats, OccupancyData, WeeklyPattern } from "@/types";

// Mock API service - Replace with actual API calls
const API_BASE = "/api";

// Mock data for development
const mockUsers: User[] = [
  { id: "1", email: "john.doe@company.com", name: "John Doe", role: "admin", createdAt: "2025-01-01" },
  { id: "2", email: "jane.smith@company.com", name: "Jane Smith", role: "user", createdAt: "2025-01-01" },
];

const mockAttendance: AttendanceRecord[] = [];

// Auth
export const login = async (email: string) => {
  // Simulate API call
  return new Promise((resolve) => setTimeout(resolve, 1000));
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
  return Promise.resolve(mockUsers);
};

export const updateUser = async (id: string, data: Partial<User>): Promise<User> => {
  const userIndex = mockUsers.findIndex(u => u.id === id);
  if (userIndex !== -1) {
    mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
    return mockUsers[userIndex];
  }
  throw new Error("User not found");
};

// Attendance
export const createAttendance = async (data: Omit<AttendanceRecord, "id" | "createdAt" | "updatedAt">): Promise<AttendanceRecord> => {
  const record: AttendanceRecord = {
    ...data,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Remove existing record for same user and date
  const index = mockAttendance.findIndex(a => a.userId === data.userId && a.date === data.date);
  if (index !== -1) {
    mockAttendance[index] = record;
  } else {
    mockAttendance.push(record);
  }
  
  return record;
};

export const getAttendance = async (params?: {
  userId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}): Promise<AttendanceRecord[]> => {
  let results = [...mockAttendance];
  
  if (params?.userId) {
    results = results.filter(a => a.userId === params.userId);
  }
  if (params?.startDate) {
    results = results.filter(a => a.date >= params.startDate!);
  }
  if (params?.endDate) {
    results = results.filter(a => a.date <= params.endDate!);
  }
  if (params?.status) {
    results = results.filter(a => a.status === params.status);
  }
  
  return Promise.resolve(results);
};

// Analytics
export const getAnalyticsOverview = async (): Promise<AttendanceStats> => {
  return Promise.resolve({
    totalUsers: mockUsers.length,
    averageOccupancy: 65,
    mostPopularDay: "Tuesday",
    remoteWorkRate: 35,
  });
};

export const getOccupancyData = async (startDate?: string, endDate?: string): Promise<OccupancyData[]> => {
  // Mock occupancy data
  const data: OccupancyData[] = [];
  const start = new Date();
  start.setDate(start.getDate() - 30);
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    data.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 40) + 10,
    });
  }
  
  return Promise.resolve(data);
};

export const getWeeklyPattern = async (): Promise<WeeklyPattern[]> => {
  return Promise.resolve([
    { day: "Mon", count: 35 },
    { day: "Tue", count: 42 },
    { day: "Wed", count: 38 },
    { day: "Thu", count: 40 },
    { day: "Fri", count: 28 },
  ]);
};
