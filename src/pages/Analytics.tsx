import { useState, useEffect, useRef } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, TrendingUp, Users, Calendar, Home, Building2, FileDown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getAnalyticsOverview, getOccupancyData, getWeeklyPattern, getUsers, getMyTeam, getAttendance } from "@/lib/api";
import { AttendanceStats, OccupancyData, WeeklyPattern, User } from "@/types";
import { isTribeLead } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface AnalyticsProps {
  currentUser: User;
}

export default function Analytics({ currentUser }: AnalyticsProps) {
  const { toast } = useToast();
  const analyticsRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [weeklyPattern, setWeeklyPattern] = useState<WeeklyPattern[]>([]);

  // Date range state
  const [dateRangePreset, setDateRangePreset] = useState<string>("last30");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isExporting, setIsExporting] = useState(false);

  // View mode state
  const [viewMode, setViewMode] = useState<string>("overview");
  const [selectedChapterLead, setSelectedChapterLead] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chapterLeads, setChapterLeads] = useState<User[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  // Personal statistics state
  const [personalStats, setPersonalStats] = useState({
    officeDays: 0,
    currentStreak: 0,
    attendanceRate: 0,
  });

  const isTribeLeadUser = isTribeLead(currentUser);
  const isChapterLeadUser = currentUser.role === "CHAPTER_LEAD";

  useEffect(() => {
    loadUsers();
    loadPersonalStats();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate, viewMode, selectedChapterLead, selectedMember]);

  const loadUsers = async () => {
    try {
      if (isTribeLeadUser) {
        // Tribe Lead can see all users
        const users = await getUsers();
        setAllUsers(users);
        const leads = users.filter(u => u.role === "CHAPTER_LEAD");
        setChapterLeads(leads);
      } else if (isChapterLeadUser) {
        // Chapter Lead can see their team
        const teamData = await getMyTeam();
        setTeamMembers(teamData.teamMembers || []);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadPersonalStats = async () => {
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
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      });

      const officeDays = workingDayRecords.filter(r => r.status === "office").length;

      // Calculate current streak (consecutive days with any status)
      const today = new Date();
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dayOfWeek = checkDate.getDay();

        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const dateStr = format(checkDate, "yyyy-MM-dd");
        const hasRecord = records.some(r => format(new Date(r.date), "yyyy-MM-dd") === dateStr);

        if (hasRecord) {
          streak++;
        } else {
          break;
        }
      }

      // Calculate working days passed this month
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

      setPersonalStats({
        officeDays,
        currentStreak: streak,
        attendanceRate: Math.min(attendanceRate, 100),
      });
    } catch (error) {
      console.error("Error loading personal stats:", error);
    }
  };

  // Update date range based on preset selection
  const handlePresetChange = (preset: string) => {
    setDateRangePreset(preset);
    const today = new Date();

    switch (preset) {
      case "last7":
        setStartDate(format(subDays(today, 7), "yyyy-MM-dd"));
        setEndDate(format(today, "yyyy-MM-dd"));
        break;
      case "last30":
        setStartDate(format(subDays(today, 30), "yyyy-MM-dd"));
        setEndDate(format(today, "yyyy-MM-dd"));
        break;
      case "thisMonth":
        setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
        setEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
        break;
      case "thisYear":
        setStartDate(format(startOfYear(today), "yyyy-MM-dd"));
        setEndDate(format(endOfYear(today), "yyyy-MM-dd"));
        break;
      case "custom":
        // Keep existing dates when switching to custom
        break;
    }
  };

  const loadAnalytics = async () => {
    // Build filter parameters based on view mode
    const filterParams: {
      startDate?: string;
      endDate?: string;
      userId?: string;
      chapterLeadId?: string;
    } = {
      startDate,
      endDate,
    };

    // Add user/team filters based on view mode
    if (viewMode === "by-individual" && selectedMember !== "all") {
      filterParams.userId = selectedMember;
    } else if (viewMode === "by-chapter-lead" && selectedChapterLead !== "all") {
      filterParams.chapterLeadId = selectedChapterLead;
    }

    const [overview, occupancy, pattern] = await Promise.all([
      getAnalyticsOverview(filterParams),
      getOccupancyData(filterParams),
      getWeeklyPattern(filterParams),
    ]);

    setStats(overview);
    setOccupancyData(occupancy);
    setWeeklyPattern(pattern);
  };

  const handleDownloadPDF = async () => {
    if (!analyticsRef.current) return;

    setIsExporting(true);
    toast({
      title: "Generating PDF",
      description: "Please wait while we create your report...",
    });

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      // Add title
      pdf.setFontSize(20);
      pdf.text("Analytics Report", margin, margin + 10);

      // Add date range
      pdf.setFontSize(12);
      pdf.text(
        `Period: ${format(new Date(startDate), "MMM d, yyyy")} - ${format(new Date(endDate), "MMM d, yyyy")}`,
        margin,
        margin + 20
      );

      let yPosition = margin + 35;

      // Capture and add stats section
      const statsCards = analyticsRef.current.querySelector('[data-section="stats"]');
      if (statsCards) {
        const canvas = await html2canvas(statsCards as HTMLElement, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }

      // Add new page for charts
      pdf.addPage();
      yPosition = margin;

      // Capture occupancy chart
      const occupancyChart = analyticsRef.current.querySelector('[data-section="occupancy-chart"]');
      if (occupancyChart) {
        pdf.setFontSize(14);
        pdf.text("Office Occupancy", margin, yPosition);
        yPosition += 5;

        const canvas = await html2canvas(occupancyChart as HTMLElement, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (yPosition + imgHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }

      // Add new page for bottom charts
      pdf.addPage();
      yPosition = margin;

      // Capture weekly pattern chart
      const weeklyChart = analyticsRef.current.querySelector('[data-section="weekly-chart"]');
      if (weeklyChart) {
        pdf.setFontSize(14);
        pdf.text("Weekly Attendance Pattern", margin, yPosition);
        yPosition += 5;

        const canvas = await html2canvas(weeklyChart as HTMLElement, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = (pageWidth - 2 * margin) / 2 - 5;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight);
      }

      // Capture status distribution chart
      const statusChart = analyticsRef.current.querySelector('[data-section="status-chart"]');
      if (statusChart) {
        pdf.setFontSize(14);
        const xPos = margin + (pageWidth - 2 * margin) / 2 + 5;
        pdf.text("Status Distribution", xPos, yPosition);
        yPosition += 5;

        const canvas = await html2canvas(statusChart as HTMLElement, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = (pageWidth - 2 * margin) / 2 - 5;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", xPos, yPosition, imgWidth, imgHeight);
      }

      // Save PDF
      const filename = `analytics-report-${startDate}-to-${endDate}.pdf`;
      pdf.save(filename);

      toast({
        title: "Success",
        description: "Analytics report downloaded successfully!",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const statusDistribution = stats?.statusDistribution
    ? [
        { name: "Office", value: stats.statusDistribution.office, color: "hsl(142 71% 45%)" },
        { name: "Remote", value: stats.statusDistribution.remote, color: "hsl(38 92% 50%)" },
        { name: "Absent", value: stats.statusDistribution.absent, color: "hsl(220 9% 46%)" },
      ]
    : [];

  const getDateRangeLabel = () => {
    if (dateRangePreset === "custom") {
      return `${format(new Date(startDate), "MMM d, yyyy")} - ${format(new Date(endDate), "MMM d, yyyy")}`;
    }

    switch (dateRangePreset) {
      case "last7":
        return "Last 7 Days";
      case "last30":
        return "Last 30 Days";
      case "thisMonth":
        return "This Month";
      case "thisYear":
        return "This Year";
      default:
        return "Last 30 Days";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div ref={analyticsRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Analytics</h1>
              {stats && (
                <div className="flex items-center gap-2 mt-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {stats.scope === "organization" ? "Organization-wide view" : "Team view"}
                    {stats.teamName && ` • ${stats.teamName}`}
                  </span>
                  <Badge variant={stats.scope === "organization" ? "default" : "secondary"}>
                    {stats.scope === "organization" ? "All Teams" : "My Team"}
                  </Badge>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleDownloadPDF}
              disabled={isExporting}
            >
              <FileDown className="h-4 w-4" />
              {isExporting ? "Generating..." : "Download Report"}
            </Button>
          </div>

          {/* Date Range and View Mode Selector */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Date Range Selection */}
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="date-preset">Date Range</Label>
                  <Select value={dateRangePreset} onValueChange={handlePresetChange}>
                    <SelectTrigger id="date-preset">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last7">Last 7 Days</SelectItem>
                      <SelectItem value="last30">Last 30 Days</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="thisYear">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {dateRangePreset === "custom" && (
                  <>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={endDate}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        max={format(new Date(), "yyyy-MM-dd")}
                      />
                    </div>
                  </>
                )}

                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">
                    Showing data for: <span className="font-semibold text-foreground">{getDateRangeLabel()}</span>
                  </div>
                </div>
              </div>

              {/* View Mode Selection */}
              {(isTribeLeadUser || isChapterLeadUser) && (
                <div className="border-t pt-6">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="view-mode">View Mode</Label>
                      <Select value={viewMode} onValueChange={(value) => {
                        setViewMode(value);
                        setSelectedChapterLead("all");
                        setSelectedMember("all");
                      }}>
                        <SelectTrigger id="view-mode">
                          <SelectValue placeholder="Select view" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overview">
                            {isTribeLeadUser ? "Organization Overview" : "Team Overview"}
                          </SelectItem>
                          {isTribeLeadUser && (
                            <SelectItem value="by-chapter-lead">By Chapter Lead</SelectItem>
                          )}
                          <SelectItem value="by-individual">Individual Members</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Chapter Lead Selector for Tribe Lead */}
                    {isTribeLeadUser && viewMode === "by-chapter-lead" && (
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="chapter-lead-filter">Chapter Lead</Label>
                        <Select value={selectedChapterLead} onValueChange={setSelectedChapterLead}>
                          <SelectTrigger id="chapter-lead-filter">
                            <SelectValue placeholder="Select Chapter Lead" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Chapter Leads</SelectItem>
                            {chapterLeads.map((lead) => (
                              <SelectItem key={lead.id} value={lead.id}>
                                {lead.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Individual Member Selector */}
                    {viewMode === "by-individual" && (
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="member-filter">Team Member</Label>
                        <Select value={selectedMember} onValueChange={setSelectedMember}>
                          <SelectTrigger id="member-filter">
                            <SelectValue placeholder="Select Member" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Members</SelectItem>
                            {isTribeLeadUser
                              ? allUsers
                                  .filter(u => u.role !== "TRIBE_LEAD")
                                  .map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.name} ({user.role === "CHAPTER_LEAD" ? "Chapter Lead" : "Reporter"})
                                    </SelectItem>
                                  ))
                              : teamMembers.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    {member.name}
                                  </SelectItem>
                                ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex-1"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Overview Stats */}
        {stats && (
          <div data-section="stats" className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-3xl font-bold">{stats.totalUsers}</p>
                  </div>
                  <Users className="h-10 w-10 text-primary opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Occupancy</p>
                    <p className="text-3xl font-bold">{stats.averageOccupancy}%</p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-success opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Popular Day</p>
                    <p className="text-2xl font-bold">{stats.mostPopularDay}</p>
                  </div>
                  <Calendar className="h-10 w-10 text-warning opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Remote Rate</p>
                    <p className="text-3xl font-bold">{stats.remoteWorkRate}%</p>
                  </div>
                  <Home className="h-10 w-10 text-neutral opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Office Occupancy Chart */}
        <Card data-section="occupancy-chart">
          <CardHeader>
            <CardTitle>Office Occupancy ({getDateRangeLabel()})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={occupancyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [`${value} people`, 'Occupancy']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2}
                  name="People in Office"
                  dot={{ fill: "hsl(217 91% 60%)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Patterns */}
          <Card data-section="weekly-chart">
            <CardHeader>
              <CardTitle>Weekly Attendance Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyPattern}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} people`, 'Average']} />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(217 91% 60%)" name="Avg. Attendance" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card data-section="status-chart">
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Personal Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Your Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Office Days This Month</p>
                <p className="text-4xl font-bold text-status-office">
                  {personalStats.officeDays > 0 ? personalStats.officeDays : "None"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Working days only</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Current Streak</p>
                <p className="text-4xl font-bold text-primary">
                  {personalStats.currentStreak > 0 ? `${personalStats.currentStreak} days` : "None"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {personalStats.currentStreak > 0 ? "Keep it up!" : "Start your streak!"}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Attendance Rate</p>
                <p className="text-4xl font-bold text-success">
                  {personalStats.attendanceRate > 0 ? `${personalStats.attendanceRate}%` : "None"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
