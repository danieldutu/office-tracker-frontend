import { useState, useEffect } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { Search, ChevronLeft, ChevronRight, Download, UserPlus, Building2, FileDown } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [exportOption, setExportOption] = useState<string>("all");
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedChapterLeads, setSelectedChapterLeads] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [showSelection, setShowSelection] = useState(false);
  const [isChapterLeadExportDialogOpen, setIsChapterLeadExportDialogOpen] = useState(false);
  const [isReporterExportDialogOpen, setIsReporterExportDialogOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [exportEndDate, setExportEndDate] = useState(format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 4), "yyyy-MM-dd"));
  const { toast } = useToast();

  const canAllocate = canAllocateAttendance(currentUser);
  const isReadOnly = isReporter(currentUser);
  const isChapterLeadUser = currentUser.role === "CHAPTER_LEAD";

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

  const generateCSV = (members: TeamMember[], filename: string, startDate: string, endDate: string) => {
    // Generate all dates between start and end
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: { dateStr: string; label: string }[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push({
        dateStr: format(d, "yyyy-MM-dd"),
        label: format(d, "EEE d"),
      });
    }

    const headers = ["Name", "Email", "Role", "Team", ...dates.map(d => d.label)];

    const rows = members.map((member) => {
      const dateStatuses = dates.map(({ dateStr }) => {
        const status = attendance[member.id]?.[dateStr];
        return status ? status : "-";
      });

      return [
        member.name,
        member.email,
        member.role,
        member.teamName || "-",
        ...dateStatuses,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportOptionChange = (value: string) => {
    setExportOption(value);
    // Show selection UI for options that need it
    if (value === "by-chapter" || value === "by-person") {
      setShowSelection(true);
      // Reset selections
      setSelectedChapterLeads([]);
      setSelectedPeople([]);
    } else {
      setShowSelection(false);
    }
  };

  const toggleChapterLead = (leadId: string) => {
    setSelectedChapterLeads(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const togglePerson = (personId: string) => {
    setSelectedPeople(prev =>
      prev.includes(personId) ? prev.filter(id => id !== personId) : [...prev, personId]
    );
  };

  const selectAllChapterLeads = () => {
    const allLeadIds = teamsByChapterLead.map(t => t.chapterLead.id);
    setSelectedChapterLeads(allLeadIds);
  };

  const selectAllPeople = () => {
    const allPeopleIds = teamMembers.map(m => m.id);
    setSelectedPeople(allPeopleIds);
  };

  const handleChapterLeadExport = () => {
    const filenameDate = `${exportStartDate}_to_${exportEndDate}`;

    switch (exportOption) {
      case "all":
        // Export all team members in one file
        generateCSV(teamMembers, `my-team-${filenameDate}.csv`, exportStartDate, exportEndDate);
        toast({
          title: "Success",
          description: `${teamMembers.length} team members exported to CSV`,
        });
        break;

      case "by-person":
        // Export selected team members
        if (selectedPeople.length === 0) {
          toast({
            title: "Error",
            description: "Please select at least one team member",
            variant: "destructive",
          });
          return;
        }
        const selectedMembers = teamMembers.filter(m => selectedPeople.includes(m.id));
        selectedMembers.forEach((member) => {
          const filename = `person-${member.name.replace(/\s+/g, "-")}-${filenameDate}.csv`;
          generateCSV([member], filename, exportStartDate, exportEndDate);
        });
        toast({
          title: "Success",
          description: `${selectedMembers.length} files exported`,
        });
        break;

      default:
        break;
    }

    setIsChapterLeadExportDialogOpen(false);
    setShowSelection(false);
    setSelectedPeople([]);
  };

  const handleExportCSV = () => {
    const filenameDate = `${exportStartDate}_to_${exportEndDate}`;

    // Reporter: Export own data only
    if (isReporter(currentUser)) {
      const reporterData = teamMembers.find(m => m.id === currentUser.id);
      if (reporterData) {
        generateCSV([reporterData], `my-schedule-${filenameDate}.csv`, exportStartDate, exportEndDate);
        toast({
          title: "Success",
          description: "Your schedule exported to CSV",
        });
      }
      setIsReporterExportDialogOpen(false);
      return;
    }

    // Chapter Lead: Handle their export options
    if (isChapterLeadUser) {
      handleChapterLeadExport();
      return;
    }

    // Advanced export options for Tribe Lead

    switch (exportOption) {
      case "all":
        // Export everyone in one file
        generateCSV(teamMembers, `all-teams-${filenameDate}.csv`, exportStartDate, exportEndDate);
        toast({
          title: "Success",
          description: "All teams exported to CSV",
        });
        break;

      case "by-chapter":
        // Export selected chapter lead teams
        if (selectedChapterLeads.length === 0) {
          toast({
            title: "Error",
            description: "Please select at least one chapter lead team",
            variant: "destructive",
          });
          return;
        }
        const selectedTeams = teamsByChapterLead.filter(t => selectedChapterLeads.includes(t.chapterLead.id));
        selectedTeams.forEach((team: any) => {
          const chapterLeadName = team.chapterLead?.name || "No-Lead";
          const filename = `team-${chapterLeadName.replace(/\s+/g, "-")}-${filenameDate}.csv`;
          generateCSV(team.members, filename, exportStartDate, exportEndDate);
        });
        toast({
          title: "Success",
          description: `${selectedTeams.length} files exported`,
        });
        break;

      case "by-person":
        // Export selected people
        if (selectedPeople.length === 0) {
          toast({
            title: "Error",
            description: "Please select at least one person",
            variant: "destructive",
          });
          return;
        }
        const selectedMembers = teamMembers.filter(m => selectedPeople.includes(m.id));
        selectedMembers.forEach((member) => {
          const filename = `person-${member.name.replace(/\s+/g, "-")}-${filenameDate}.csv`;
          generateCSV([member], filename, exportStartDate, exportEndDate);
        });
        toast({
          title: "Success",
          description: `${selectedMembers.length} files exported`,
        });
        break;

      case "chapter-leads-only":
        // Export all chapter leads in one file
        const chapterLeads = teamMembers.filter(m => m.role === "CHAPTER_LEAD");
        generateCSV(chapterLeads, `chapter-leads-${filenameDate}.csv`, exportStartDate, exportEndDate);
        toast({
          title: "Success",
          description: `${chapterLeads.length} chapter leads exported to CSV`,
        });
        break;

      default:
        break;
    }

    setIsExportDialogOpen(false);
    setShowSelection(false);
    setSelectedChapterLeads([]);
    setSelectedPeople([]);
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
            {isChapterLeadUser ? (
              <Dialog open={isChapterLeadExportDialogOpen} onOpenChange={setIsChapterLeadExportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Team Schedule</DialogTitle>
                    <DialogDescription>
                      Choose how you want to export your team's schedules
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Date Range Selection */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="start-date-chapter">Start Date</Label>
                        <Input
                          id="start-date-chapter"
                          type="date"
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date-chapter">End Date</Label>
                        <Input
                          id="end-date-chapter"
                          type="date"
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <RadioGroup value={exportOption} onValueChange={handleExportOptionChange}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all-chapter" />
                        <Label htmlFor="all-chapter" className="cursor-pointer">
                          <div className="font-medium">All Team Members (Single File)</div>
                          <div className="text-xs text-muted-foreground">
                            Export all {teamMembers.length} team members in one CSV file
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="by-person" id="by-person-chapter" />
                        <Label htmlFor="by-person-chapter" className="cursor-pointer">
                          <div className="font-medium">By Team Member</div>
                          <div className="text-xs text-muted-foreground">
                            Select team members to export individually
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>

                    {/* Selection UI for team members */}
                    {showSelection && exportOption === "by-person" && (
                      <div className="border rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
                        <div className="flex items-center justify-between">
                          <Label className="font-semibold">Select Team Members:</Label>
                          <Button variant="ghost" size="sm" onClick={selectAllPeople}>
                            Select All
                          </Button>
                        </div>
                        <Input
                          placeholder="Search team members..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="mb-2"
                        />
                        {filteredMembers.map((member) => (
                          <div key={member.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`member-${member.id}`}
                              checked={selectedPeople.includes(member.id)}
                              onCheckedChange={() => togglePerson(member.id)}
                            />
                            <Label htmlFor={`member-${member.id}`} className="cursor-pointer font-normal">
                              {member.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button className="w-full" onClick={handleExportCSV}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Export {showSelection && exportOption === "by-person" && selectedPeople.length > 0 && `(${selectedPeople.length})`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : isTribeLead(currentUser) ? (
              <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Schedule Options</DialogTitle>
                    <DialogDescription>
                      Choose how you want to export the team schedules
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Date Range Selection */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="start-date-tribe">Start Date</Label>
                        <Input
                          id="start-date-tribe"
                          type="date"
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date-tribe">End Date</Label>
                        <Input
                          id="end-date-tribe"
                          type="date"
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <RadioGroup value={exportOption} onValueChange={handleExportOptionChange}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all" className="cursor-pointer">
                          <div className="font-medium">All Teams (Single File)</div>
                          <div className="text-xs text-muted-foreground">
                            Export everyone in one CSV file
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="by-chapter" id="by-chapter" />
                        <Label htmlFor="by-chapter" className="cursor-pointer">
                          <div className="font-medium">By Chapter Lead Team</div>
                          <div className="text-xs text-muted-foreground">
                            Select teams to export
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="by-person" id="by-person" />
                        <Label htmlFor="by-person" className="cursor-pointer">
                          <div className="font-medium">By Person</div>
                          <div className="text-xs text-muted-foreground">
                            Select people to export individually
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="chapter-leads-only" id="chapter-leads-only" />
                        <Label htmlFor="chapter-leads-only" className="cursor-pointer">
                          <div className="font-medium">All Chapter Leads (Single File)</div>
                          <div className="text-xs text-muted-foreground">
                            Export only chapter leads in one file
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>

                    {/* Selection UI for chapter leads */}
                    {showSelection && exportOption === "by-chapter" && (
                      <div className="border rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
                        <div className="flex items-center justify-between">
                          <Label className="font-semibold">Select Chapter Lead Teams:</Label>
                          <Button variant="ghost" size="sm" onClick={selectAllChapterLeads}>
                            Select All
                          </Button>
                        </div>
                        {teamsByChapterLead.map((team: any) => (
                          <div key={team.chapterLead.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`lead-${team.chapterLead.id}`}
                              checked={selectedChapterLeads.includes(team.chapterLead.id)}
                              onCheckedChange={() => toggleChapterLead(team.chapterLead.id)}
                            />
                            <Label htmlFor={`lead-${team.chapterLead.id}`} className="cursor-pointer font-normal">
                              {team.chapterLead.name} ({team.members.length} members)
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selection UI for people */}
                    {showSelection && exportOption === "by-person" && (
                      <div className="border rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
                        <div className="flex items-center justify-between">
                          <Label className="font-semibold">Select People:</Label>
                          <Button variant="ghost" size="sm" onClick={selectAllPeople}>
                            Select All
                          </Button>
                        </div>
                        <Input
                          placeholder="Search people..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="mb-2"
                        />
                        {filteredMembers.map((member) => (
                          <div key={member.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`person-${member.id}`}
                              checked={selectedPeople.includes(member.id)}
                              onCheckedChange={() => togglePerson(member.id)}
                            />
                            <Label htmlFor={`person-${member.id}`} className="cursor-pointer font-normal">
                              {member.name} ({member.role})
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button className="w-full" onClick={handleExportCSV}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Export {showSelection && exportOption === "by-chapter" && selectedChapterLeads.length > 0 && `(${selectedChapterLeads.length})`}
                      {showSelection && exportOption === "by-person" && selectedPeople.length > 0 && `(${selectedPeople.length})`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={isReporterExportDialogOpen} onOpenChange={setIsReporterExportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export My Schedule</DialogTitle>
                    <DialogDescription>
                      Select the date range to export your schedule
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Date Range Selection */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="start-date-reporter">Start Date</Label>
                        <Input
                          id="start-date-reporter"
                          type="date"
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date-reporter">End Date</Label>
                        <Input
                          id="end-date-reporter"
                          type="date"
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button className="w-full" onClick={handleExportCSV}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Export My Schedule
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
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
