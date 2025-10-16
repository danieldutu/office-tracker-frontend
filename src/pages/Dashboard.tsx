import { useState, useEffect } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { Building2, Home, XCircle, TrendingUp, User as UserIcon, Info } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttendanceStatus, User } from "@/types";
import { createAttendance, getAttendance, getUsers, getMyTeam } from "@/lib/api";
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
  const today = format(new Date(), "yyyy-MM-dd");

  const isUserReporter = isReporter(currentUser);
  const canSetOwnStatus = !isUserReporter || canAllocateAttendance(currentUser);

  useEffect(() => {
    loadTodayStatus();
    loadWeekAttendance();
    loadTeamStatus();
    if (isUserReporter) {
      loadChapterLead();
    }
  }, [currentUser.id]);

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
      attendance[record.date] = record.status;
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
      const teamData = await getMyTeam();
      if (teamData.chapterLead) {
        setChapterLeadName(teamData.chapterLead.name);
      }
    } catch (error) {
      console.error("Error loading chapter lead:", error);
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

        {/* Quick Status Update - Only for Leaders */}
        {canSetOwnStatus ? (
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
        ) : (
          /* Schedule Overview for Reporters */
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-background">
            <CardHeader>
              <CardTitle className="text-center text-2xl flex items-center justify-center gap-2">
                <Info className="h-6 w-6 text-blue-600" />
                Your Schedule This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Your attendance is managed by {chapterLeadName ? (
                    <span className="font-semibold text-foreground">{chapterLeadName}</span>
                  ) : (
                    "your Chapter Lead"
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Check the calendar or contact your lead if you need to make changes
                </p>
              </div>

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
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* This Week's Schedule - Only for Leaders */}
          {canSetOwnStatus && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>This Week's Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-3">
                  {weekDays.map(({ dateStr, day, dayNum }) => (
                    <div key={dateStr} className="text-center space-y-2">
                      <div className="text-sm font-medium">{day}</div>
                      <div className="text-xs text-muted-foreground">{dayNum}</div>
                      <div className="h-16 flex items-center justify-center">
                        {weekAttendance[dateStr] ? (
                          <StatusBadge status={weekAttendance[dateStr]} size="sm" showIcon={false} />
                        ) : (
                          <div className="text-xs text-muted-foreground">Not set</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Summary */}
          <Card className={canSetOwnStatus ? "" : "lg:col-span-3"}>
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
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Days in Office</p>
                  <p className="text-3xl font-bold">8</p>
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
                  <p className="text-3xl font-bold">12</p>
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
                    95%
                    <TrendingUp className="h-5 w-5 text-success" />
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
