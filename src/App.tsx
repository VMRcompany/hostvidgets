import { useEffect, useState } from "react";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import EmbedPlayer from "./components/EmbedPlayer";
import SecretWidgetPage from "./components/SecretWidgetPage";
import { Loader2 } from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState<"landing" | "auth" | "dashboard">("landing");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  
  // Authentication states
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string; phoneNumber?: string; photoURL?: string } | null>(null);
  const [appLoading, setAppLoading] = useState(true);

  // Parse paths
  const path = window.location.pathname;
  const isEmbedView = path.startsWith("/embed/");
  const embedWidgetId = isEmbedView ? path.split("/embed/")[1] : null;

  const isSecretView = path.startsWith("/w/");
  const secretWidgetId = isSecretView ? path.split("/w/")[1] : null;

  useEffect(() => {
    // If it's an embed or secret view, we don't need auth checks
    if (isEmbedView || isSecretView) {
      setAppLoading(false);
      return;
    }

    // Auto-login from localStorage token
    const storedToken = localStorage.getItem("hostvidgets_user_token");
    if (!storedToken) {
      setAppLoading(false);
      return;
    }

    // Validate token with server
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${storedToken}` }
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Session expired");
        }
        return res.json();
      })
      .then((data) => {
        setToken(storedToken);
        setUser(data.user);
        setCurrentView("dashboard");
        setAppLoading(false);
      })
      .catch(() => {
        // Clear stale credentials if invalid
        localStorage.removeItem("hostvidgets_user_token");
        localStorage.removeItem("hostvidgets_user");
        setAppLoading(false);
      });
  }, [isEmbedView]);

  const handleAuthSuccess = (newToken: string, newUser: { id: string; email?: string; phoneNumber?: string }) => {
    localStorage.setItem("hostvidgets_user_token", newToken);
    localStorage.setItem("hostvidgets_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("hostvidgets_user_token");
    localStorage.removeItem("hostvidgets_user");
    setToken(null);
    setUser(null);
    setCurrentView("landing");
  };

  const triggerAuthMode = (mode: "login" | "register") => {
    setAuthMode(mode);
    setCurrentView("auth");
  };

  if (appLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-indigo-500" />
          <span className="text-sm font-semibold tracking-tight">Подключение к HostVidgets...</span>
        </div>
      </div>
    );
  }

  // Route: Embed view
  if (isEmbedView && embedWidgetId) {
    return <EmbedPlayer widgetId={embedWidgetId} />;
  }

  // Route: Standalone Secret Widget Page
  if (isSecretView && secretWidgetId) {
    return <SecretWidgetPage widgetId={secretWidgetId} />;
  }

  // Direct Page Rendering
  switch (currentView) {
    case "landing":
      return <LandingPage onStartAuth={triggerAuthMode} />;
    
    case "auth":
      return (
        <AuthPage
          initialMode={authMode}
          onBackToLanding={() => setCurrentView("landing")}
          onAuthSuccess={handleAuthSuccess}
        />
      );
    
    case "dashboard":
      if (!token || !user) {
        return <LandingPage onStartAuth={triggerAuthMode} />;
      }
      return (
        <Dashboard
          token={token}
          user={user}
          onLogout={handleLogout}
        />
      );
    
    default:
      return <LandingPage onStartAuth={triggerAuthMode} />;
  }
}
