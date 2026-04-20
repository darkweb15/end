import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Scraper } from "./pages/Scraper";
import { Results } from "./pages/Results";
import { TaskHistory } from "./pages/TaskHistory";
import { Settings } from "./pages/Settings";
import { api } from "./lib/api";

export default function App() {
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; reason?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await api.getDbStatus();
        if (!cancelled) setDbStatus(s);
      } catch {
        if (!cancelled) setDbStatus({ connected: false, reason: "unreachable" });
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar dbStatus={dbStatus} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scraper" element={<Scraper />} />
          <Route path="/results" element={<Results />} />
          <Route path="/history" element={<TaskHistory />} />
          <Route path="/settings" element={<Settings dbStatus={dbStatus} />} />
        </Routes>
      </div>
    </div>
  );
}
