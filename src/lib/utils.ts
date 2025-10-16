import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Strip @company.com from email for display purposes
export function formatEmail(email: string): string {
  return email.replace(/@company\.com$/, "");
}
