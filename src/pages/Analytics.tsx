import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Users, Calendar, Home } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getAnalyticsOverview, getOccupancyData, getWeeklyPattern } from "@/lib/api";
import { AttendanceStats, OccupancyData, WeeklyPattern } from "@/types";

export default function Analytics() {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [weeklyPattern, setWeeklyPattern] = useState<WeeklyPattern[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    const [overview, occupancy, pattern] = await Promise.all([
      getAnalyticsOverview(),
      getOccupancyData(),
      getWeeklyPattern(),
    ]);
    
    setStats(overview);
    setOccupancyData(occupancy);
    setWeeklyPattern(pattern);
  };

  const statusDistribution = [
    { name: "Office", value: 40, color: "hsl(142 71% 45%)" },
    { name: "Remote", value: 35, color: "hsl(38 92% 50%)" },
    { name: "Absent", value: 25, color: "hsl(220 9% 46%)" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        </div>

        {/* Overview Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        <Card>
          <CardHeader>
            <CardTitle>Office Occupancy (Last 30 Days)</CardTitle>
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
          <Card>
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
          <Card>
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
                <p className="text-4xl font-bold text-status-office">8</p>
                <p className="text-xs text-muted-foreground mt-2">vs team avg: 7.2</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Current Streak</p>
                <p className="text-4xl font-bold text-primary">5 days</p>
                <p className="text-xs text-muted-foreground mt-2">Keep it up!</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Attendance Rate</p>
                <p className="text-4xl font-bold text-success">95%</p>
                <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +5% from last month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
