export type AttendanceStatus = "office" | "remote" | "off";

export type UserRole = "REPORTER" | "CHAPTER_LEAD" | "TRIBE_LEAD";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  teamName?: string;
  chapterLeadId?: string;
  isFirstLogin: boolean;
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
  scope?: "team" | "organization";
  teamName?: string;
}

export interface OccupancyData {
  date: string;
  count: number;
}

export interface WeeklyPattern {
  day: string;
  count: number;
}

export interface TeamMember extends User {
  attendance?: AttendanceRecord[];
}

export interface MyTeamResponse {
  chapterLead?: {
    id: string;
    name: string;
    email: string;
  };
  teamMembers: TeamMember[];
  isReadOnly: boolean;
  teamsByChapterLead?: Array<{
    chapterLead: {
      id: string;
      name: string;
      email: string;
      teamName?: string;
    };
    members: TeamMember[];
  }>;
}

export interface ChapterLeadInfo {
  id: string;
  name: string;
  email: string;
  teamName?: string;
  avatarUrl?: string;
  directReportsCount: number;
  directReports: TeamMember[];
}

export interface TeamHierarchyResponse {
  tribeLead: {
    id: string;
    name: string;
    email: string;
  };
  chapterLeads: ChapterLeadInfo[];
  totalUsers: number;
  scope: "team" | "organization";
}
