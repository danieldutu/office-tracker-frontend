import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Team from "./pages/Team";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { User } from "./types";
import { getCurrentUser, logout } from "./lib/api";

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {!currentUser ? (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <>
            <Navigation currentUser={currentUser} onLogout={handleLogout} />
            <Routes>
              <Route path="/" element={<Dashboard currentUser={currentUser} />} />
              <Route path="/calendar" element={<Calendar currentUser={currentUser} />} />
              <Route path="/team" element={<Team />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/profile" element={<Profile currentUser={currentUser} onUpdate={setCurrentUser} />} />
              {currentUser.role === "admin" && (
                <Route path="/admin" element={<Admin />} />
              )}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </>
        )}
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
