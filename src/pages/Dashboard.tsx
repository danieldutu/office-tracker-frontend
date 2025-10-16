import { useState, useEffect } from "react";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { Building2, Home, XCircle, TrendingUp, User as UserIcon, Info, CalendarCheck, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttendanceStatus, User } from "@/types";
import { createAttendance, getAttendance, getUsers, getMyTeam, getOfficeCapacity } from "@/lib/api";
import { isReporter, canAllocateAttendance } from "@/lib/permissions";

interface DashboardProps {
  currentUser: User;
}

export default function Dashboard({ currentUser }: DashboardProps) {
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [weekAttendance, setWeekAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [teamInOffice, setTeamInOffice] = useState<User[]>([]);
  const [chapterLeadName, setChapterLeadName] = useState("");
  const [officeCapacity, setOfficeCapacity] = useState<any>(null);
  const [capacityWeekOffset, setCapacityWeekOffset] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState({
    officeDays: 0,
    remoteDays: 0,
    attendanceRate: 0,
  });
  const today = format(new Date(), "yyyy-MM-dd");

  const isUserReporter = isReporter(currentUser);
  const isTribeLeadUser = currentUser.role === "TRIBE_LEAD";
  const isChapterLead = currentUser.role === "CHAPTER_LEAD";
  const canViewCapacity = isTribeLeadUser || isChapterLead;

  useEffect(() => {
    loadTodayStatus();
    loadWeekAttendance();
    loadTeamStatus();
    loadMonthlyStats();
    if (!isTribeLeadUser) {
      loadChapterLead();
    }
    if (canViewCapacity) {
      loadOfficeCapacity();
    }
  }, [currentUser.id, capacityWeekOffset]);

  const loadTodayStatus = async () => {
    const records = await getAttendance({
      userId: currentUser.id,
      startDate: today,
      endDate: today,
    });
    if (records.length > 0) {
      setSelectedStatus(records[0].status);
      setNotes(records[0].notes || "");
    }
  };

  const loadWeekAttendance = async () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const records = await getAttendance({
      userId: currentUser.id,
      startDate: format(weekStart, "yyyy-MM-dd"),
      endDate: format(addDays(weekStart, 6), "yyyy-MM-dd"),
    });

    const attendance: Record<string, AttendanceStatus> = {};
    records.forEach(record => {
      // Normalize date to YYYY-MM-DD format
      const dateKey = format(new Date(record.date), "yyyy-MM-dd");
      attendance[dateKey] = record.status;
    });
    setWeekAttendance(attendance);
  };

  const loadTeamStatus = async () => {
    const users = await getUsers();
    const allRecords = await getAttendance({
      startDate: today,
      endDate: today,
      status: "office",
    });

    const officeUserIds = new Set(allRecords.map(r => r.userId));
    const inOffice = users.filter(u => officeUserIds.has(u.id));
    setTeamInOffice(inOffice);
  };

  const loadChapterLead = async () => {
    try {
      if (currentUser.role === "CHAPTER_LEAD") {
        // Chapter Leads are managed by Tribe Lead (Andreea Mihailescu)
        const users = await getUsers();
        const tribeLead = users.find(u => u.role === "TRIBE_LEAD");
        if (tribeLead) {
          setChapterLeadName(tribeLead.name);
        }
      } else if (currentUser.role === "REPORTER") {
        // Reporters are managed by their Chapter Lead
        const teamData = await getMyTeam();
        if (teamData.chapterLead) {
          setChapterLeadName(teamData.chapterLead.name);
        }
      }
    } catch (error) {
      console.error("Error loading chapter lead:", error);
    }
  };

  const loadOfficeCapacity = async () => {
    try {
      const data = await getOfficeCapacity(capacityWeekOffset);
      setOfficeCapacity(data);
    } catch (error) {
      console.error("Error loading office capacity:", error);
    }
  };

  const handlePreviousWeek = () => {
    setCapacityWeekOffset(capacityWeekOffset - 1);
  };

  const handleNextWeek = () => {
    setCapacityWeekOffset(capacityWeekOffset + 1);
  };

  const handleToday = () => {
    setCapacityWeekOffset(0);
  };

  // Calculate the displayed week date range
  const getWeekDateRange = () => {
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const targetWeekStart = addWeeks(currentWeekStart, capacityWeekOffset);
    const targetWeekEnd = addDays(targetWeekStart, 4); // Friday
    return {
      start: targetWeekStart,
      end: targetWeekEnd,
      monthYear: format(targetWeekStart, "MMMM yyyy")
    };
  };

  const loadMonthlyStats = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const records = await getAttendance({
        userId: currentUser.id,
        startDate: format(startOfMonth, "yyyy-MM-dd"),
        endDate: format(endOfMonth, "yyyy-MM-dd"),
      });

      // Filter to only working days (Monday-Friday)
      const workingDayRecords = records.filter(r => {
        const date = new Date(r.date);
        const dayOfWeek = date.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // 1=Monday, 5=Friday
      });

      const officeDays = workingDayRecords.filter(r => r.status === "office").length;
      const remoteDays = workingDayRecords.filter(r => r.status === "remote").length;

      // Calculate working days passed this month
      const today = new Date();
      let workingDaysPassed = 0;
      for (let d = 1; d <= today.getDate(); d++) {
        const date = new Date(today.getFullYear(), today.getMonth(), d);
        const dayOfWeek = date.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          workingDaysPassed++;
        }
      }

      const totalDays = workingDayRecords.length;
      const attendanceRate = workingDaysPassed > 0 ? Math.round((totalDays / workingDaysPassed) * 100) : 0;

      setMonthlyStats({
        officeDays,
        remoteDays,
        attendanceRate: Math.min(attendanceRate, 100),
      });
    } catch (error) {
      console.error("Error loading monthly stats:", error);
    }
  };

  const handleStatusSelect = async (status: AttendanceStatus) => {
    setSelectedStatus(status);

    try {
      await createAttendance({
        userId: currentUser.id,
        date: today,
        status,
        notes,
      });

      toast.success("Status updated successfully!");
      loadWeekAttendance();
      loadTeamStatus();
      loadMonthlyStats();
      if (canViewCapacity) {
        loadOfficeCapacity();
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const statusCards = [
    { status: "office" as AttendanceStatus, icon: Building2, label: "Office", color: "border-status-office hover:bg-status-office-bg" },
    { status: "remote" as AttendanceStatus, icon: Home, label: "Remote", color: "border-status-remote hover:bg-status-remote-bg" },
    { status: "absent" as AttendanceStatus, icon: XCircle, label: "Absent", color: "border-status-absent hover:bg-status-absent-bg" },
  ];

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
    return {
      date,
      dateStr: format(date, "yyyy-MM-dd"),
      day: format(date, "EEE"),
      dayNum: format(date, "d"),
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar name={currentUser.name} avatar={currentUser.avatar} size="lg" />
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {currentUser.name.split(" ")[0]}!</h1>
              <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
            </div>
          </div>
          {selectedStatus && <StatusBadge status={selectedStatus} size="lg" />}
        </div>

        {/* Quick Status Update - Only for Tribe Lead */}
        {isTribeLeadUser && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-center text-2xl">How are you working today?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statusCards.map(({ status, icon: Icon, label, color }) => (
                  <button
                    key={status}
                    onClick={() => handleStatusSelect(status)}
                    className={cn(
                      "relative p-6 rounded-xl border-2 transition-all",
                      "hover:scale-105 hover:shadow-lg",
                      selectedStatus === status ? "ring-2 ring-primary ring-offset-2" : "",
                      color
                    )}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Icon className="h-12 w-12" />
                      <span className="font-semibold text-lg">{label}</span>
                      {selectedStatus === status && (
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {!showNotes ? (
                <Button variant="outline" onClick={() => setShowNotes(true)} className="w-full">
                  Add notes (optional)
                </Button>
              ) : (
                <Textarea
                  placeholder="Add any notes about your work location today..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Schedule Overview for Everyone */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-background">
          <CardHeader>
            <CardTitle className="text-center text-2xl flex items-center justify-center gap-2">
              <Info className="h-6 w-6 text-blue-600" />
              Your Schedule This Week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isTribeLeadUser && (
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Your attendance is managed by {chapterLeadName ? (
                    <span className="font-semibold text-foreground">{chapterLeadName}</span>
                  ) : (
                    "the Tribe Lead"
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Check the calendar or contact your lead if you need to make changes
                </p>
              </div>
            )}

            <div className="grid grid-cols-5 gap-3">
              {weekDays.map(({ dateStr, day, dayNum }) => (
                <div key={dateStr} className="text-center space-y-2">
                  <div className="text-sm font-medium">{day}</div>
                  <div className="text-xs text-muted-foreground">{dayNum}</div>
                  <div className="h-20 flex items-center justify-center">
                    {weekAttendance[dateStr] ? (
                      <div className="flex flex-col items-center gap-2">
                        <StatusBadge status={weekAttendance[dateStr]} size="md" showIcon={true} />
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">
                        Not set
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => window.location.href = "/calendar"}>
                View Full Calendar
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => window.location.href = "/team"}>
                View Team Schedule
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Office Capacity Widget - Only for Chapter Leads and Tribe Lead */}
        {canViewCapacity && officeCapacity && (
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-background">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                  disabled={capacityWeekOffset === 0}
                  className="text-sm"
                >
                  Today
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePreviousWeek}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-center min-w-[150px]">
                    <div className="text-lg font-semibold">
                      {getWeekDateRange().monthYear}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextWeek}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="w-[72px]"></div>
              </div>
              <CardTitle className="text-center text-2xl flex items-center justify-center gap-2">
                <CalendarCheck className="h-6 w-6 text-green-600" />
                Office Capacity {capacityWeekOffset === 0 ? "This Week" : ""}
              </CardTitle>
              <p className="text-center text-sm text-muted-foreground">
                Real-time office occupancy to prevent overbooking
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {officeCapacity.weekData.map((day: any) => (
                  <div
                    key={day.date}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all",
                      day.isOverbooked
                        ? "border-red-300 bg-red-50"
                        : day.available <= 5
                        ? "border-amber-300 bg-amber-50"
                        : "border-green-300 bg-green-50"
                    )}
                  >
                    <div className="space-y-3">
                      {/* Day Header */}
                      <div className="text-center">
                        <div className="font-semibold text-sm">{day.day}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(day.date), "MMM d")}
                        </div>
                      </div>

                      {/* Capacity Stats */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Capacity:</span>
                          <span className="font-semibold">{day.capacity}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Booked:</span>
                          <span className="font-semibold">{day.booked}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Available:</span>
                          <span className={cn(
                            "font-bold",
                            day.isOverbooked ? "text-red-600" : day.available <= 5 ? "text-amber-600" : "text-green-600"
                          )}>
                            {day.isOverbooked ? "FULL" : day.available}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <Progress
                          value={Math.min(day.utilizationPercent, 100)}
                          className={cn(
                            "h-2",
                            day.isOverbooked ? "[&>div]:bg-red-500" :
                            day.utilizationPercent >= 80 ? "[&>div]:bg-amber-500" :
                            "[&>div]:bg-green-500"
                          )}
                        />
                        <div className="text-center text-xs font-medium">
                          {day.utilizationPercent}%
                        </div>
                      </div>

                      {/* Warning Badge */}
                      {day.isOverbooked && (
                        <div className="flex items-center justify-center gap-1 text-xs text-red-600 font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          Overbooked
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {officeCapacity.weekData.reduce((sum: number, day: any) => sum + day.available, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Available Spots</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {officeCapacity.weekData.reduce((sum: number, day: any) => sum + day.booked, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Bookings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(
                      officeCapacity.weekData.reduce((sum: number, day: any) => sum + day.utilizationPercent, 0) /
                      officeCapacity.weekData.length
                    )}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg. Utilization</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Who's in the office today?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{teamInOffice.length}</div>
              <div className="text-sm text-muted-foreground">people in office</div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {teamInOffice.slice(0, 8).map(user => (
                <UserAvatar key={user.id} name={user.name} avatar={user.avatar} size="sm" />
              ))}
              {teamInOffice.length > 8 && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  +{teamInOffice.length - 8}
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/team"}>
              View full team →
            </Button>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Days in Office</p>
                  <p className="text-3xl font-bold">{monthlyStats.officeDays}</p>
                </div>
                <Building2 className="h-10 w-10 text-status-office opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Remote Days</p>
                  <p className="text-3xl font-bold">{monthlyStats.remoteDays}</p>
                </div>
                <Home className="h-10 w-10 text-status-remote opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  <p className="text-3xl font-bold flex items-center gap-2">
                    {monthlyStats.attendanceRate}%
                    {monthlyStats.attendanceRate > 0 && (
                      <TrendingUp className="h-5 w-5 text-success" />
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
