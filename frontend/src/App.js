import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const [dbStatus, setDbStatus] = useState(null);
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const s = await api.getDbStatus();
                if (!cancelled)
                    setDbStatus(s);
            }
            catch {
                if (!cancelled)
                    setDbStatus({ connected: false, reason: "unreachable" });
            }
        };
        load();
        const id = setInterval(load, 30_000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);
    return (_jsxs("div", { className: "min-h-screen flex bg-background text-foreground", children: [_jsx(Sidebar, { dbStatus: dbStatus }), _jsx("div", { className: "flex-1 min-w-0", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/scraper", element: _jsx(Scraper, {}) }), _jsx(Route, { path: "/results", element: _jsx(Results, {}) }), _jsx(Route, { path: "/history", element: _jsx(TaskHistory, {}) }), _jsx(Route, { path: "/settings", element: _jsx(Settings, { dbStatus: dbStatus }) })] }) })] }));
}
