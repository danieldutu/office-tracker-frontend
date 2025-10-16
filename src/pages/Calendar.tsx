import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttendanceStatus, User, AttendanceRecord } from "@/types";
import { createAttendance, getAttendance } from "@/lib/api";

interface CalendarProps {
  currentUser: User;
}

export default function Calendar({ currentUser }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});

  useEffect(() => {
    loadMonthAttendance();
  }, [currentMonth, currentUser.id]);

  const loadMonthAttendance = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const records = await getAttendance({
      userId: currentUser.id,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    });

    const attendanceMap: Record<string, AttendanceRecord> = {};
    records.forEach(record => {
      // Normalize date to YYYY-MM-DD format
      const dateKey = format(new Date(record.date), "yyyy-MM-dd");
      attendanceMap[dateKey] = record;
    });
    setAttendance(attendanceMap);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, "yyyy-MM-dd");
    const record = attendance[dateStr];
    
    if (record) {
      setSelectedStatus(record.status);
      setNotes(record.notes || "");
    } else {
      setSelectedStatus(null);
      setNotes("");
    }
  };

  const handleSave = async () => {
    if (!selectedDate || !selectedStatus) return;

    try {
      await createAttendance({
        userId: currentUser.id,
        date: format(selectedDate, "yyyy-MM-dd"),
        status: selectedStatus,
        notes,
      });
      
      toast.success("Attendance updated successfully!");
      setSelectedDate(null);
      loadMonthAttendance();
    } catch (error) {
      toast.error("Failed to update attendance");
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const allCalendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  // Filter to show only weekdays (Monday-Friday)
  const calendarDays = allCalendarDays.filter(day => {
    const dayOfWeek = day.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // 1=Monday, 5=Friday
  });
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const statusOptions: { status: AttendanceStatus; label: string }[] = [
    { status: "office", label: "Office" },
    { status: "remote", label: "Remote" },
    { status: "absent", label: "Absent" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Calendar</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-lg font-semibold min-w-[200px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-5 gap-px bg-border rounded-lg overflow-hidden">
              {/* Week day headers */}
              {weekDays.map(day => (
                <div key={day} className="bg-muted p-3 text-center font-semibold text-sm">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const record = attendance[dateStr];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isPast = day < new Date() && !isToday(day);
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      "bg-card p-3 min-h-[100px] text-left hover:bg-muted/50 transition-colors",
                      !isCurrentMonth && "opacity-40",
                      isToday(day) && "ring-2 ring-primary ring-inset"
                    )}
                  >
                    <div className="font-medium text-sm mb-2">{format(day, "d")}</div>
                    {record && (
                      <StatusBadge status={record.status} size="sm" />
                    )}
                    {isPast && !record && (
                      <div className="text-xs text-muted-foreground">No data</div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-6 justify-center">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-status-office" />
                <span className="text-sm">Office</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-status-remote" />
                <span className="text-sm">Remote</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-status-absent" />
                <span className="text-sm">Absent</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={selectedDate !== null} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="bg-popover">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {statusOptions.map(({ status, label }) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? "default" : "outline"}
                  onClick={() => setSelectedStatus(status)}
                  className="h-auto py-4"
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1" disabled={!selectedStatus}>
                Save
              </Button>
              <Button variant="outline" onClick={() => setSelectedDate(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
