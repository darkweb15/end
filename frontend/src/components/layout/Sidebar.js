import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Radar, Database, History, Settings as SettingsIcon, Sparkles, Circle, } from "lucide-react";
import { cn } from "@/lib/utils";
const items = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/scraper", label: "Scraper", icon: Radar },
    { to: "/results", label: "Results", icon: Database },
    { to: "/history", label: "Task History", icon: History },
    { to: "/settings", label: "Settings", icon: SettingsIcon },
];
export function Sidebar({ dbStatus, }) {
    return (_jsxs("aside", { className: "hidden md:flex w-60 shrink-0 flex-col border-r border-border/60 bg-surface/40 backdrop-blur-md sticky top-0 h-screen", children: [_jsx("div", { className: "px-5 py-6 border-b border-border/60", children: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "h-9 w-9 rounded-xl bg-gradient-violet grid place-items-center shadow-glow", children: _jsx(Sparkles, { className: "h-4 w-4 text-white", strokeWidth: 2.5 }) }), _jsxs("div", { children: [_jsx("div", { className: "font-semibold tracking-tight text-foreground leading-none", children: "LeadScraper" }), _jsx("div", { className: "text-[11px] text-muted-foreground mt-0.5 tracking-wider uppercase", children: "Pro" })] })] }) }), _jsx("nav", { className: "flex-1 px-3 py-4 space-y-1", children: items.map((item) => (_jsxs(NavLink, { to: item.to, end: item.to === "/", className: ({ isActive }) => cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all", isActive
                        ? "bg-primary/10 text-foreground glow-ring"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-2"), children: [_jsx(item.icon, { className: "h-4 w-4" }), _jsx("span", { children: item.label })] }, item.to))) }), _jsx("div", { className: "px-3 pb-5", children: _jsxs("div", { className: "flex items-center gap-2 rounded-xl border border-border/60 bg-surface-2/60 px-3 py-2.5", children: [_jsx(Circle, { className: cn("h-2.5 w-2.5 fill-current", dbStatus?.connected ? "text-emerald-400" : "text-red-400") }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-xs font-medium text-foreground", children: dbStatus?.connected ? "Supabase Connected" : "Supabase Offline" }), !dbStatus?.connected && dbStatus?.reason && (_jsx("span", { className: "text-[10px] text-muted-foreground", children: dbStatus.reason }))] })] }) })] }));
}
