import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/UserAvatar";
import { Search, UserPlus, Trash2, Edit, Download, Building2, Users as UsersIcon, UserCog, AlertTriangle } from "lucide-react";
import { User, TeamHierarchyResponse } from "@/types";
import { getUsers, getTeamHierarchy, createUser, createDelegation, getDelegations, revokeDelegation } from "@/lib/api";
import { getRoleName, getRoleColor } from "@/lib/permissions";
import { formatEmail } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminProps {
  currentUser: User;
}

export default function Admin({ currentUser }: AdminProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [hierarchy, setHierarchy] = useState<TeamHierarchyResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isDelegateDialogOpen, setIsDelegateDialogOpen] = useState(false);
  const [isResetStatsDialogOpen, setIsResetStatsDialogOpen] = useState(false);
  const [isResetConfirmDialogOpen, setIsResetConfirmDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [delegations, setDelegations] = useState<any[]>([]);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "REPORTER" as "REPORTER" | "CHAPTER_LEAD",
    chapterLeadId: "",
    teamName: "",
  });

  // Delegation form state
  const [delegationFormData, setDelegationFormData] = useState({
    delegateId: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
  });

  const isTribeLeadUser = currentUser.role === "TRIBE_LEAD";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const promises: Promise<any>[] = [
        getUsers(),
        getTeamHierarchy(),
      ];

      if (isTribeLeadUser) {
        promises.push(getDelegations());
      }

      const results = await Promise.all(promises);

      setUsers(results[0]);
      setHierarchy(results[1]);

      if (isTribeLeadUser && results[2]) {
        setDelegations(results[2]);
      }
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "REPORTER",
      chapterLeadId: "",
      teamName: "",
    });
  };

  const handleAddUser = async () => {
    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.role === "REPORTER" && !formData.chapterLeadId) {
      toast({
        title: "Validation Error",
        description: "Please select a Chapter Lead for this Reporter",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        chapterLeadId: formData.role === "REPORTER" ? formData.chapterLeadId : undefined,
        teamName: formData.teamName || undefined,
      });

      toast({
        title: "Success",
        description: "User created successfully",
      });

      setIsAddUserDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDelegation = async () => {
    if (!delegationFormData.delegateId) {
      toast({
        title: "Validation Error",
        description: "Please select a delegate",
        variant: "destructive",
      });
      return;
    }

    const start = new Date(delegationFormData.startDate);
    const end = new Date(delegationFormData.endDate);

    if (start >= end) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createDelegation(delegationFormData);

      toast({
        title: "Success",
        description: "Delegation created successfully",
      });

      setIsDelegateDialogOpen(false);
      setDelegationFormData({
        delegateId: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      });
      await loadData();
    } catch (error) {
      console.error("Error creating delegation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create delegation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeDelegation = async (id: string) => {
    try {
      await revokeDelegation(id);
      toast({
        title: "Success",
        description: "Delegation revoked successfully",
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke delegation",
        variant: "destructive",
      });
    }
  };

  const handleResetStatistics = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:3000/api/admin/reset-statistics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser.email,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to reset statistics");
      }

      toast({
        title: "Success",
        description: "All statistics have been reset successfully",
      });
      setIsResetConfirmDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset statistics",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const chapterLeads = users.filter(u => u.role === "CHAPTER_LEAD");
  const eligibleDelegates = users.filter(u => u.role === "CHAPTER_LEAD" && u.id !== currentUser.id);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDelegations = delegations.filter(d => {
    const now = new Date();
    const start = new Date(d.startDate);
    const end = new Date(d.endDate);
    return d.isActive && start <= now && end >= now;
  });

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
          <div className="flex gap-2">
            {isTribeLeadUser && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setIsDelegateDialogOpen(true)}>
                  <UserCog className="h-4 w-4" />
                  Delegate Admin
                </Button>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setIsResetConfirmDialogOpen(true)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Reset Statistics
                </Button>
              </>
            )}
            <Button className="gap-2" onClick={() => setIsAddUserDialogOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        {/* Active Delegations Alert */}
        {isTribeLeadUser && activeDelegations.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-900">Active Delegations</p>
                  <p className="text-sm text-blue-700">
                    {activeDelegations.map(d => {
                      const delegate = users.find(u => u.id === d.delegateId);
                      return delegate?.name;
                    }).join(", ")}
                    {activeDelegations.length === 1 ? " has" : " have"} temporary admin access
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => activeDelegations.forEach(d => handleRevokeDelegation(d.id))}
                >
                  Revoke All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                          <td className="p-3 text-muted-foreground">{formatEmail(user.email)}</td>
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
                                    <p className="text-xs text-muted-foreground">{formatEmail(lead.email)}</p>
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

        {/* Add User Dialog */}
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account and assign them to a team.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "REPORTER" | "CHAPTER_LEAD") =>
                    setFormData({ ...formData, role: value, chapterLeadId: "" })
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REPORTER">Reporter</SelectItem>
                    <SelectItem value="CHAPTER_LEAD">Chapter Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === "REPORTER" && (
                <div className="space-y-2">
                  <Label htmlFor="chapterLead">Chapter Lead *</Label>
                  <Select
                    value={formData.chapterLeadId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, chapterLeadId: value })
                    }
                  >
                    <SelectTrigger id="chapterLead">
                      <SelectValue placeholder="Select Chapter Lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapterLeads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name} {lead.teamName && `(${lead.teamName})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name (Optional)</Label>
                <Input
                  id="teamName"
                  placeholder="e.g., Marketing, Engineering"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddUserDialogOpen(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleAddUser} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delegate Admin Dialog */}
        <Dialog open={isDelegateDialogOpen} onOpenChange={setIsDelegateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Delegate Admin Access</DialogTitle>
              <DialogDescription>
                Grant temporary admin privileges to another user. This is useful when you're on holiday or unavailable.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="delegate">Delegate To *</Label>
                <Select
                  value={delegationFormData.delegateId}
                  onValueChange={(value) =>
                    setDelegationFormData({ ...delegationFormData, delegateId: value })
                  }
                >
                  <SelectTrigger id="delegate">
                    <SelectValue placeholder="Select a Chapter Lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleDelegates.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <span>{user.name}</span>
                          {user.teamName && (
                            <span className="text-xs text-muted-foreground">({user.teamName})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only Chapter Leads can receive delegated admin access
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={delegationFormData.startDate}
                    onChange={(e) =>
                      setDelegationFormData({ ...delegationFormData, startDate: e.target.value })
                    }
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={delegationFormData.endDate}
                    onChange={(e) =>
                      setDelegationFormData({ ...delegationFormData, endDate: e.target.value })
                    }
                    min={delegationFormData.startDate}
                  />
                </div>
              </div>

              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> The delegate will have full admin access during this period.
                  You can revoke the delegation at any time.
                </p>
              </div>

              {delegations.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Delegations</Label>
                  <div className="space-y-2">
                    {delegations.filter(d => d.isActive).map((delegation) => {
                      const delegate = users.find(u => u.id === delegation.delegateId);
                      return (
                        <div
                          key={delegation.id}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          <div className="text-sm">
                            <p className="font-medium">{delegate?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(delegation.startDate), "MMM d, yyyy")} -{" "}
                              {format(new Date(delegation.endDate), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeDelegation(delegation.id)}
                          >
                            Revoke
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDelegateDialogOpen(false);
                  setDelegationFormData({
                    delegateId: "",
                    startDate: format(new Date(), "yyyy-MM-dd"),
                    endDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
                  });
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateDelegation} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Delegation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Statistics Confirmation Dialog */}
        <AlertDialog open={isResetConfirmDialogOpen} onOpenChange={setIsResetConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Reset All Statistics?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p className="font-semibold">This action will permanently delete:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All attendance records</li>
                  <li>All delegations</li>
                  <li>All office capacity settings</li>
                </ul>
                <p className="text-red-600 font-semibold">
                  User accounts will NOT be affected. This action cannot be undone.
                </p>
                <p>Are you absolutely sure you want to proceed?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetStatistics}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? "Resetting..." : "Yes, Reset All Statistics"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
