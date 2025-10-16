import {
  User,
  AttendanceRecord,
  AttendanceStats,
  OccupancyData,
  WeeklyPattern,
  MyTeamResponse,
  TeamHierarchyResponse
} from "@/types";

// Production API URL - using localhost for development
const API_BASE = "http://localhost:3000/api";

// Helper to get auth headers
const getAuthHeaders = () => {
  const user = localStorage.getItem("currentUser");
  if (!user) return {};

  const userData = JSON.parse(user);
  return {
    "x-user-email": userData.email, // Development auth header
  };
};

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
  const res = await fetch(`${API_BASE}/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  const data = await res.json();
  return data.data || data;
};

export const getUser = async (id: string): Promise<User> => {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  const data = await res.json();
  return data.data || data;
};

export const createUser = async (userData: Partial<User>): Promise<User> => {
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(userData),
  });

  if (!res.ok) throw new Error("Failed to create user");
  const data = await res.json();
  return data.data || data;
};

export const updateUser = async (id: string, data: Partial<User>): Promise<User> => {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to update user");
  const result = await res.json();
  return result.data || result;
};

export const deleteUser = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error("Failed to delete user");
};

// Attendance
export const createAttendance = async (data: Omit<AttendanceRecord, "id" | "createdAt" | "updatedAt">): Promise<AttendanceRecord> => {
  const res = await fetch(`${API_BASE}/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to create attendance");
  const result = await res.json();
  return result.data || result;
};

export const allocateAttendance = async (data: {
  userId: string;
  date: string;
  status: string;
  notes?: string;
}): Promise<AttendanceRecord> => {
  const res = await fetch(`${API_BASE}/attendance/allocate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to allocate attendance");
  const result = await res.json();
  return result.data || result;
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
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch attendance");
  const result = await res.json();
  return result.data || result;
};

// Analytics
export const getAnalyticsOverview = async (params?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
  chapterLeadId?: string;
}): Promise<AttendanceStats> => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.set("startDate", params.startDate);
  if (params?.endDate) queryParams.set("endDate", params.endDate);
  if (params?.userId) queryParams.set("userId", params.userId);
  if (params?.chapterLeadId) queryParams.set("chapterLeadId", params.chapterLeadId);

  const url = `${API_BASE}/analytics/overview${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch analytics overview");
  const result = await res.json();
  return result.data || result;
};

export const getOccupancyData = async (params?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
  chapterLeadId?: string;
}): Promise<OccupancyData[]> => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.set("startDate", params.startDate);
  if (params?.endDate) queryParams.set("endDate", params.endDate);
  if (params?.userId) queryParams.set("userId", params.userId);
  if (params?.chapterLeadId) queryParams.set("chapterLeadId", params.chapterLeadId);

  const url = `${API_BASE}/analytics/occupancy${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch occupancy data");
  const result = await res.json();
  return result.data || result;
};

export const getWeeklyPattern = async (params?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
  chapterLeadId?: string;
}): Promise<WeeklyPattern[]> => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.set("startDate", params.startDate);
  if (params?.endDate) queryParams.set("endDate", params.endDate);
  if (params?.userId) queryParams.set("userId", params.userId);
  if (params?.chapterLeadId) queryParams.set("chapterLeadId", params.chapterLeadId);

  const url = `${API_BASE}/analytics/weekly-pattern${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch weekly pattern");
  const result = await res.json();
  return result.data || result;
};

// Team Management
export const getMyTeam = async (): Promise<MyTeamResponse> => {
  const res = await fetch(`${API_BASE}/teams/my-team`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch team");
  const result = await res.json();
  return result.data || result;
};

// Delegation Management
export const createDelegation = async (data: {
  delegateId: string;
  startDate: string;
  endDate: string;
}): Promise<any> => {
  const res = await fetch(`${API_BASE}/delegations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create delegation");
  const result = await res.json();
  return result.data || result;
};

export const getDelegations = async (): Promise<any[]> => {
  const res = await fetch(`${API_BASE}/delegations`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch delegations");
  const result = await res.json();
  return result.data || result;
};

export const revokeDelegation = async (id: string): Promise<any> => {
  const res = await fetch(`${API_BASE}/delegations?id=${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to revoke delegation");
  const result = await res.json();
  return result.data || result;
};

export const getActiveDelegation = async (): Promise<{
  hasActiveDelegation: boolean;
  delegation: any;
}> => {
  const res = await fetch(`${API_BASE}/delegations/active`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to check delegation");
  const result = await res.json();
  return result.data || result;
};

export const getTeamHierarchy = async (): Promise<TeamHierarchyResponse> => {
  const res = await fetch(`${API_BASE}/teams/hierarchy`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch team hierarchy");
  const result = await res.json();
  return result.data || result;
};

export const getDirectReports = async (userId: string): Promise<any> => {
  const res = await fetch(`${API_BASE}/users/${userId}/reports`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch direct reports");
  const result = await res.json();
  return result.data || result;
};

// Office Capacity
export const getOfficeCapacity = async (): Promise<{
  weekData: Array<{
    day: string;
    date: string;
    capacity: number;
    booked: number;
    available: number;
    isOverbooked: boolean;
    utilizationPercent: number;
  }>;
  capacitySettings: Array<{
    id: string;
    dayOfWeek: string;
    capacity: number;
  }>;
}> => {
  const res = await fetch(`${API_BASE}/office-capacity`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch office capacity");
  const result = await res.json();
  return result.data || result;
};
