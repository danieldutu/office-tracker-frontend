import { useState, useEffect } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { Search, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { User, AttendanceRecord, AttendanceStatus } from "@/types";
import { getUsers, getAttendance } from "@/lib/api";

export default function Team() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [attendance, setAttendance] = useState<Record<string, Record<string, AttendanceStatus>>>({});

  useEffect(() => {
    loadUsers();
    loadWeekAttendance();
  }, [currentWeekStart]);

  const loadUsers = async () => {
    const allUsers = await getUsers();
    setUsers(allUsers);
  };

  const loadWeekAttendance = async () => {
    const weekEnd = addDays(currentWeekStart, 6);
    const records = await getAttendance({
      startDate: format(currentWeekStart, "yyyy-MM-dd"),
      endDate: format(weekEnd, "yyyy-MM-dd"),
    });

    const attendanceMap: Record<string, Record<string, AttendanceStatus>> = {};
    records.forEach(record => {
      if (!attendanceMap[record.userId]) {
        attendanceMap[record.userId] = {};
      }
      attendanceMap[record.userId][record.date] = record.status;
    });
    
    setAttendance(attendanceMap);
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

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Team Schedule</h1>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">People in office this week</p>
                <p className="text-3xl font-bold text-primary">{officeCount}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total team members</p>
                <p className="text-2xl font-semibold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user.name} avatar={user.avatar} size="sm" />
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      {weekDays.map(({ dateStr }) => {
                        const status = attendance[user.id]?.[dateStr];
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

            {filteredUsers.length === 0 && (
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
