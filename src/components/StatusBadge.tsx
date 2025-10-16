import { AttendanceStatus } from "@/types";
import { Building2, Home, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: AttendanceStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge = ({ status, size = "md", showIcon = true, className }: StatusBadgeProps) => {
  const config = {
    office: {
      label: "Office",
      icon: Building2,
      bgColor: "bg-status-office-bg",
      textColor: "text-status-office",
    },
    remote: {
      label: "Remote",
      icon: Home,
      bgColor: "bg-status-remote-bg",
      textColor: "text-status-remote",
    },
    absent: {
      label: "Absent",
      icon: XCircle,
      bgColor: "bg-status-absent-bg",
      textColor: "text-status-absent",
    },
  };

  const { label, icon: Icon, bgColor, textColor } = config[status];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        bgColor,
        textColor,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {label}
    </span>
  );
};
