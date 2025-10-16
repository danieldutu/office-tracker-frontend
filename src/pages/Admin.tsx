import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { Search, UserPlus, Trash2, Edit, Download } from "lucide-react";
import { User } from "@/types";
import { getUsers } from "@/lib/api";

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const allUsers = await getUsers();
    setUsers(allUsers);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
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
                        <th className="text-left p-3 font-semibold">Joined</th>
                        <th className="text-right p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={user.name} avatar={user.avatar} size="sm" />
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{user.email}</td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === "admin" 
                                ? "bg-primary/10 text-primary" 
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {user.role}
                            </span>
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

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Attendance management features coming soon</p>
                </div>
              </CardContent>
            </Card>
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
