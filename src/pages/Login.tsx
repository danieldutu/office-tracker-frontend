import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { setCurrentUser } from "@/lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setIsLoading(true);

    try {
      // For demo/testing: Use mock authentication
      // In production, this would call the backend API
      if (email === "admin@company.com" && password === "admin123") {
        const mockUser = {
          id: "1",
          email,
          name: "Admin User",
          role: "admin" as const,
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(mockUser);
        toast.success("Welcome back!");
        navigate("/");
      } else {
        toast.error("Invalid email or password");
        setIsLoading(false);
      }
    } catch (error) {
      toast.error("Failed to login. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/5">
      <div className="w-full max-w-md p-8">
        <div className="bg-card rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Office Tracker</h1>
            <p className="text-muted-foreground">Track your team's office presence</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground">
            <p>Demo credentials:</p>
            <p className="font-mono mt-1">admin@company.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
