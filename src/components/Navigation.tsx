import { Link, useLocation } from "react-router-dom";
import { Building2, Calendar, Users, BarChart3, User, Settings, LogOut } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { User as UserType } from "@/types";
import { canAccessAdmin, canViewAnalytics, getRoleName, getRoleColor } from "@/lib/permissions";

interface NavigationProps {
  currentUser: UserType | null;
  onLogout: () => void;
}

export const Navigation = ({ currentUser, onLogout }: NavigationProps) => {
  const location = useLocation();

  // Build navigation items based on role
  const navItems = [
    { path: "/", label: "Dashboard", icon: Building2 },
    { path: "/calendar", label: "Calendar", icon: Calendar },
    { path: "/team", label: "Team", icon: Users },
  ];

  if (currentUser && canViewAnalytics(currentUser)) {
    navItems.push({ path: "/analytics", label: "Analytics", icon: BarChart3 });
  }

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <Building2 className="h-6 w-6 text-primary" />
              <span>Office Tracker</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity">
                <UserAvatar name={currentUser.name} avatar={currentUser.avatarUrl} size="sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                  <Badge className={cn("text-xs mt-1", getRoleColor(currentUser.role))}>
                    {getRoleName(currentUser.role)}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {canAccessAdmin(currentUser) && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="flex items-center gap-2 cursor-pointer">
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
};
