import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Save, Upload, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { User, AttendanceRecord } from "@/types";
import { updateUser, getAttendance, changePassword } from "@/lib/api";
import { formatEmail } from "@/lib/utils";

interface ProfileProps {
  currentUser: User;
  onUpdate: (user: User) => void;
}

export default function Profile({ currentUser, onUpdate }: ProfileProps) {
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar || "");
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [currentUser.id]);

  const loadHistory = async () => {
    const records = await getAttendance({
      userId: currentUser.id,
    });
    setHistory(records.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20));
  };

  const hasChanges = name !== currentUser.name || avatar !== (currentUser.avatar || "");

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateUser(currentUser.id, { name, avatar: avatar || undefined });
      onUpdate(updated);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Profile</h1>

        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <UserAvatar name={name} avatar={avatar} size="xl" />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold">{currentUser.name}</h2>
                <p className="text-muted-foreground">{formatEmail(currentUser.email)}</p>
                <div className="mt-2">
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                    {currentUser.role === "admin" ? "Administrator" : "Team Member"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                value={formatEmail(currentUser.email)}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="avatar" className="text-sm font-medium">
                Avatar URL (optional)
              </label>
              <Input
                id="avatar"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="w-full md:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="currentPassword" className="text-sm font-medium">
                Current Password
              </label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm New Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
              className="w-full md:w-auto"
            >
              <Lock className="h-4 w-4 mr-2" />
              {isChangingPassword ? "Changing..." : "Change Password"}
            </Button>
          </CardContent>
        </Card>

        {/* Attendance History */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.length > 0 ? (
                <div className="divide-y">
                  {history.map(record => (
                    <div key={record.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {format(new Date(record.date), "EEEE, MMMM d, yyyy")}
                        </p>
                        {record.notes && (
                          <p className="text-sm text-muted-foreground">{record.notes}</p>
                        )}
                      </div>
                      <StatusBadge status={record.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No attendance records yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
