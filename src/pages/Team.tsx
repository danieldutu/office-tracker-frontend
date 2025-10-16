import { useState, useEffect } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { Search, ChevronLeft, ChevronRight, Download, UserPlus, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/UserAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { User, AttendanceStatus, TeamMember } from "@/types";
import { getMyTeam, allocateAttendance } from "@/lib/api";
import { canAllocateAttendance, getRoleName, getRoleColor, isTribeLead, isReporter } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";

interface TeamProps {
  currentUser: User;
}

export default function Team({ currentUser }: TeamProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [attendance, setAttendance] = useState<Record<string, Record<string, AttendanceStatus>>>({});
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>("office");
  const [isAllocating, setIsAllocating] = useState(false);
  const [chapterLeadName, setChapterLeadName] = useState("");
  const [teamsByChapterLead, setTeamsByChapterLead] = useState<any[]>([]);
  const { toast } = useToast();

  const canAllocate = canAllocateAttendance(currentUser);
  const isReadOnly = isReporter(currentUser);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      const teamData = await getMyTeam();

      // Handle different response structures based on role
      if (teamData.teamsByChapterLead) {
        // Tribe Lead - multiple teams
        setTeamsByChapterLead(teamData.teamsByChapterLead);
        const allMembers: TeamMember[] = [];
        teamData.teamsByChapterLead.forEach((team: any) => {
          allMembers.push(...team.members);
        });
        setTeamMembers(allMembers);
      } else {
        // Chapter Lead or Reporter - single team
        setTeamMembers(teamData.teamMembers || []);
        if (teamData.chapterLead) {
          setChapterLeadName(teamData.chapterLead.name);
        }
      }

      // Build attendance map from team members
      const attendanceMap: Record<string, Record<string, AttendanceStatus>> = {};
      const members = teamData.teamsByChapterLead
        ? teamData.teamsByChapterLead.flatMap((t: any) => t.members)
        : teamData.teamMembers || [];

      members.forEach((member: TeamMember) => {
        if (member.attendance) {
          attendanceMap[member.id] = {};
          member.attendance.forEach((record) => {
            attendanceMap[member.id][record.date] = record.status;
          });
        }
      });
      setAttendance(attendanceMap);
    } catch (error) {
      console.error("Error loading team:", error);
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive",
      });
    }
  };

  const handleAllocate = async () => {
    if (!selectedUser || !selectedDate || !canAllocate) return;

    setIsAllocating(true);
    try {
      await allocateAttendance({
        userId: selectedUser.id,
        date: selectedDate,
        status: selectedStatus,
      });

      toast({
        title: "Success",
        description: `Attendance allocated for ${selectedUser.name}`,
      });

      // Update local state
      setAttendance((prev) => ({
        ...prev,
        [selectedUser.id]: {
          ...prev[selectedUser.id],
          [selectedDate]: selectedStatus,
        },
      }));

      setSelectedUser(null);
      setSelectedDate("");
      setSelectedStatus("office");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to allocate attendance",
        variant: "destructive",
      });
    } finally {
      setIsAllocating(false);
    }
  };

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const date = addDays(currentWeekStart, i);
    return {
      date,
      dateStr: format(date, "yyyy-MM-dd"),
      day: format(date, "EEE"),
      dayNum: format(date, "d"),
    };
  });

  const filteredMembers = teamMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const officeCount = Object.values(attendance).reduce((count, userAttendance) => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return count + (userAttendance[todayStr] === "office" ? 1 : 0);
  }, 0);

  const handlePreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const handleThisWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleExportCSV = () => {
    // Create CSV header
    const headers = ["Name", "Email", "Role", "Team", ...weekDays.map(({ day, dayNum }) => `${day} ${dayNum}`)];

    // Create CSV rows
    const rows = filteredMembers.map((member) => {
      const weekStatus = weekDays.map(({ dateStr }) => {
        const status = attendance[member.id]?.[dateStr];
        return status ? status : "-";
      });

      return [
        member.name,
        member.email,
        member.role,
        member.teamName || "-",
        ...weekStatus,
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `team-schedule-${format(currentWeekStart, "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Team schedule exported to CSV",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Schedule</h1>
            {chapterLeadName && (
              <p className="text-sm text-muted-foreground mt-1">
                Chapter Lead: {chapterLeadName}
              </p>
            )}
            {isTribeLead(currentUser) && (
              <p className="text-sm text-muted-foreground mt-1">
                Organization-wide view • {teamsByChapterLead.length} teams
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {canAllocate && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Allocate Attendance
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Allocate Team Attendance</DialogTitle>
                    <DialogDescription>
                      Set attendance for your team members
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Team Member</label>
                      <Select
                        value={selectedUser?.id}
                        onValueChange={(id) =>
                          setSelectedUser(teamMembers.find((m) => m.id === id) || null)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date</label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={selectedStatus}
                        onValueChange={(value) => setSelectedStatus(value as AttendanceStatus)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                          <SelectItem value="off">Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleAllocate}
                      disabled={!selectedUser || !selectedDate || isAllocating}
                    >
                      {isAllocating ? "Allocating..." : "Allocate"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Read-only banner for reporters */}
        {isReadOnly && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-900">
                  You're viewing your team's schedule (read-only). Use the Calendar page to manage your own attendance.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">People in office today</p>
                <p className="text-3xl font-bold text-primary">{officeCount}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {isTribeLead(currentUser) ? "Total employees" : "Team members"}
                </p>
                <p className="text-2xl font-semibold">{teamMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tribe Lead: Teams Overview */}
        {isTribeLead(currentUser) && teamsByChapterLead.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Teams Overview</CardTitle>
              <CardDescription>All chapter leads and their teams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teamsByChapterLead.map((team: any) => (
                  <Card key={team.chapterLead.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={team.chapterLead.name}
                          avatar={team.chapterLead.avatarUrl}
                          size="sm"
                        />
                        <div>
                          <CardTitle className="text-base">{team.chapterLead.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {team.chapterLead.teamName || "Team Lead"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-primary">{team.members.length}</p>
                      <p className="text-xs text-muted-foreground">Team members</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleThisWeek}>
              This Week
            </Button>
            <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium min-w-[180px] text-center">
              Week of {format(currentWeekStart, "MMM d, yyyy")}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Team Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Team Member</th>
                    {weekDays.map(({ day, dayNum }) => (
                      <th key={day} className="p-3 text-center font-semibold min-w-[100px]">
                        <div>{day}</div>
                        <div className="text-xs text-muted-foreground font-normal">{dayNum}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={member.name} avatar={member.avatarUrl} size="sm" />
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                            {isTribeLead(currentUser) && member.teamName && (
                              <Badge className="text-xs mt-1" variant="outline">
                                {member.teamName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      {weekDays.map(({ dateStr }) => {
                        const status = attendance[member.id]?.[dateStr];
                        return (
                          <td key={dateStr} className="p-3 text-center">
                            {status ? (
                              <div className="flex justify-center">
                                <StatusBadge status={status} size="sm" showIcon={false} />
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredMembers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No team members found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
