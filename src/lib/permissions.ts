import { User, UserRole } from "@/types";

// Role checks
export const isReporter = (user: User): boolean => user.role === "REPORTER";
export const isChapterLead = (user: User): boolean => user.role === "CHAPTER_LEAD";
export const isTribeLead = (user: User): boolean => user.role === "TRIBE_LEAD";

// Permission checks
export const canAccessAdmin = (user: User): boolean => {
  return isTribeLead(user);
};

export const canViewAnalytics = (user: User): boolean => {
  return isChapterLead(user) || isTribeLead(user);
};

export const canAllocateAttendance = (user: User): boolean => {
  return isChapterLead(user) || isTribeLead(user);
};

export const canManageUsers = (user: User): boolean => {
  return isTribeLead(user);
};

export const canViewTeamHierarchy = (user: User): boolean => {
  return isChapterLead(user) || isTribeLead(user);
};

export const canEditUser = (currentUser: User, targetUserId: string): boolean => {
  // Users can edit themselves, Tribe Lead can edit anyone
  return currentUser.id === targetUserId || isTribeLead(currentUser);
};

export const canDeleteUser = (user: User): boolean => {
  return isTribeLead(user);
};

// UI helpers
export const getRoleName = (role: UserRole): string => {
  switch (role) {
    case "REPORTER":
      return "Reporter";
    case "CHAPTER_LEAD":
      return "Chapter Lead";
    case "TRIBE_LEAD":
      return "Tribe Lead";
    default:
      return role;
  }
};

export const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case "REPORTER":
      return "bg-blue-100 text-blue-800";
    case "CHAPTER_LEAD":
      return "bg-purple-100 text-purple-800";
    case "TRIBE_LEAD":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getNavigationItems = (user: User) => {
  const baseItems = [
    { path: "/", label: "Dashboard", icon: "LayoutDashboard" },
    { path: "/calendar", label: "Calendar", icon: "Calendar" },
    { path: "/profile", label: "Profile", icon: "User" },
  ];

  // Add team view for everyone
  baseItems.splice(2, 0, {
    path: "/team",
    label: "Team",
    icon: "Users",
  });

  // Add analytics for Chapter Leads and Tribe Lead
  if (canViewAnalytics(user)) {
    baseItems.push({
      path: "/analytics",
      label: "Analytics",
      icon: "BarChart3",
    });
  }

  // Add admin for Tribe Lead only
  if (canAccessAdmin(user)) {
    baseItems.push({
      path: "/admin",
      label: "Admin",
      icon: "Settings",
    });
  }

  return baseItems;
};
