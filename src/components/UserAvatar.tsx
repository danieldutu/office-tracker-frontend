import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  avatar?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const UserAvatar = ({ name, avatar, size = "md", className }: UserAvatarProps) => {
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getColorFromName = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const sizes = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-16 w-16 text-xl",
    xl: "h-24 w-24 text-2xl",
  };

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={cn("rounded-full object-cover", sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-white",
        sizes[size],
        getColorFromName(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};
