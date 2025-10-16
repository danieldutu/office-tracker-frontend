import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { Search, UserPlus, Trash2, Edit, Download, Building2, Users as UsersIcon } from "lucide-react";
import { User, TeamHierarchyResponse } from "@/types";
import { getUsers, getTeamHierarchy } from "@/lib/api";
import { getRoleName, getRoleColor } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";

interface AdminProps {
  currentUser: User;
}

export default function Admin({ currentUser }: AdminProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [hierarchy, setHierarchy] = useState<TeamHierarchyResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allUsers, hierarchyData] = await Promise.all([
        getUsers(),
        getTeamHierarchy(),
      ]);
      setUsers(allUsers);
      setHierarchy(hierarchyData);
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <div className="flex items-center gap-2 mt-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Organization Management • {users.length} employees
                {hierarchy && ` • ${hierarchy.chapterLeads.length} teams`}
              </span>
            </div>
          </div>
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="hierarchy">Organization Hierarchy</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Team Members ({users.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">User</th>
                        <th className="text-left p-3 font-semibold">Email</th>
                        <th className="text-left p-3 font-semibold">Role</th>
                        <th className="text-left p-3 font-semibold">Team</th>
                        <th className="text-left p-3 font-semibold">Joined</th>
                        <th className="text-right p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={user.name} avatar={user.avatarUrl} size="sm" />
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{user.email}</td>
                          <td className="p-3">
                            <Badge className={getRoleColor(user.role)}>
                              {getRoleName(user.role)}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {user.teamName || "-"}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hierarchy">
            <div className="space-y-6">
              {hierarchy && (
                <>
                  {/* Tribe Lead Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Tribe Lead</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <UserAvatar name={hierarchy.tribeLead.name} size="md" />
                        <div>
                          <p className="font-semibold text-lg">{hierarchy.tribeLead.name}</p>
                          <p className="text-sm text-muted-foreground">{hierarchy.tribeLead.email}</p>
                          <Badge className="mt-2 bg-red-100 text-red-800">Tribe Lead</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Chapter Leads */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Chapter Leads & Teams ({hierarchy.chapterLeads.length})</CardTitle>
                      <CardDescription>
                        {hierarchy.totalUsers} total employees across all teams
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {hierarchy.chapterLeads.map((lead) => (
                          <Card key={lead.id} className="border-2">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <UserAvatar name={lead.name} avatar={lead.avatarUrl} size="sm" />
                                  <div>
                                    <CardTitle className="text-base">{lead.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                                    {lead.teamName && (
                                      <Badge variant="outline" className="mt-1">
                                        {lead.teamName}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-primary">
                                    {lead.directReportsCount}
                                  </p>
                                  <p className="text-xs text-muted-foreground">team members</p>
                                </div>
                              </div>
                            </CardHeader>
                            {lead.directReports && lead.directReports.length > 0 && (
                              <CardContent>
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-muted-foreground mb-2">
                                    Team Members:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {lead.directReports.map((member) => (
                                      <div
                                        key={member.id}
                                        className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md"
                                      >
                                        <UserAvatar
                                          name={member.name}
                                          avatar={member.avatarUrl}
                                          size="xs"
                                        />
                                        <span className="text-sm">{member.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
              {!hierarchy && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading hierarchy...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Reports & Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Advanced reporting features coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
