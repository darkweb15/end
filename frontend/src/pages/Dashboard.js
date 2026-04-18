import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Mail, TrendingUp, Activity, ArrowUpRight, Sparkles, ArrowRight, } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, } from "recharts";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";
const COLORS = ["#7C5CFF", "#22D3EE", "#34D399", "#F59E0B", "#F472B6"];
export function Dashboard() {
    const [stats, setStats] = useState({
        total_businesses: 0,
        total_emails: 0,
        total_tasks: 0,
    });
    const [tasks, setTasks] = useState([]);
    const [data, setData] = useState([]);
    useEffect(() => {
        (async () => {
            const [s, t, d] = await Promise.all([
                api.getStats().catch(() => ({
                    total_businesses: 0,
                    total_emails: 0,
                    total_tasks: 0,
                })),
                api.getTasks().catch(() => ({ tasks: [] })),
                api.getData("", 1000).catch(() => ({ data: [], count: 0 })),
            ]);
            setStats(s);
            setTasks(t.tasks);
            setData(d.data);
        })();
    }, []);
    const successRate = useMemo(() => {
        if (!stats.total_businesses)
            return 0;
        return Math.round((stats.total_emails / stats.total_businesses) * 100);
    }, [stats]);
    const activeJobs = tasks.filter((t) => t.status === "Running").length;
    // Leads by industry (top 6) for bar chart
    const byIndustry = useMemo(() => {
        const map = new Map();
        for (const row of data) {
            const key = row.search_query || "Other";
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        return [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, count]) => ({ name, count }));
    }, [data]);
    // Leads per day (last 14 days) for line chart
    const byDay = useMemo(() => {
        const map = new Map();
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = `${d.getMonth() + 1}/${d.getDate()}`;
            map.set(key, { leads: 0, emails: 0 });
        }
        for (const row of data) {
            const c = row.created_at;
            if (!c)
                continue;
            const d = new Date(c);
            const key = `${d.getMonth() + 1}/${d.getDate()}`;
            const bucket = map.get(key);
            if (bucket) {
                bucket.leads += 1;
                if (row.final_email)
                    bucket.emails += 1;
            }
        }
        return [...map.entries()].map(([day, v]) => ({ day, ...v }));
    }, [data]);
    // POS detection share for pie chart
    const posShare = useMemo(() => {
        const map = new Map();
        for (const row of data) {
            const key = row.pos_system || (row.has_pos === "Yes" ? "Other POS" : "None");
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        return [...map.entries()]
            .filter(([k]) => k !== "None")
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [data]);
    const kpis = [
        {
            label: "Total Leads",
            value: formatNumber(stats.total_businesses),
            delta: "+12.4%",
            icon: Users,
            accent: "from-violet-500/30 to-transparent",
            iconBg: "bg-primary/15 text-primary",
        },
        {
            label: "Emails Extracted",
            value: formatNumber(stats.total_emails),
            delta: "+8.1%",
            icon: Mail,
            accent: "from-cyan-500/25 to-transparent",
            iconBg: "bg-cyan-500/15 text-cyan-400",
        },
        {
            label: "Success Rate",
            value: `${successRate}%`,
            delta: successRate >= 40 ? "+3.2%" : "−1.1%",
            icon: TrendingUp,
            accent: "from-emerald-500/25 to-transparent",
            iconBg: "bg-emerald-500/15 text-emerald-400",
        },
        {
            label: "Active Jobs",
            value: String(activeJobs),
            delta: activeJobs ? "live" : "idle",
            icon: Activity,
            accent: "from-amber-500/25 to-transparent",
            iconBg: "bg-amber-500/15 text-amber-400",
        },
    ];
    return (_jsxs(_Fragment, { children: [_jsx(Header, { title: "Dashboard", subtitle: "Realtime overview of your scraping pipeline" }), _jsxs("div", { className: "p-6 space-y-6", children: [_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4", children: kpis.map((k) => (_jsxs(Card, { className: "relative overflow-hidden card-hover", children: [_jsx("div", { className: `absolute inset-0 bg-gradient-to-br ${k.accent} opacity-60 pointer-events-none` }), _jsxs(CardContent, { className: "relative p-5", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsx("div", { className: `h-10 w-10 rounded-xl grid place-items-center ${k.iconBg}`, children: _jsx(k.icon, { className: "h-4 w-4" }) }), _jsxs(Badge, { variant: k.delta.startsWith("−") ? "danger" : "success", children: [_jsx(ArrowUpRight, { className: "h-3 w-3" }), k.delta] })] }), _jsxs("div", { className: "mt-5", children: [_jsx("div", { className: "stat-value", children: k.value }), _jsx("div", { className: "stat-label mt-1", children: k.label })] })] })] }, k.label))) }), _jsxs("div", { className: "grid grid-cols-1 xl:grid-cols-3 gap-4", children: [_jsxs(Card, { className: "xl:col-span-2", children: [_jsxs(CardHeader, { children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Leads over time" }), _jsx(CardDescription, { children: "Last 14 days \u00B7 scraped leads & emails found" })] }), _jsx(Badge, { variant: "muted", children: "14d" })] }), _jsx(CardContent, { className: "h-72", children: _jsx(ResponsiveContainer, { children: _jsxs(AreaChart, { data: byDay, margin: { top: 8, right: 0, left: -20, bottom: 0 }, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "gLeads", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#7C5CFF", stopOpacity: 0.45 }), _jsx("stop", { offset: "100%", stopColor: "#7C5CFF", stopOpacity: 0 })] }), _jsxs("linearGradient", { id: "gEmails", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#22D3EE", stopOpacity: 0.45 }), _jsx("stop", { offset: "100%", stopColor: "#22D3EE", stopOpacity: 0 })] })] }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1F2937" }), _jsx(XAxis, { dataKey: "day", stroke: "#94A3B8", fontSize: 11, tickLine: false }), _jsx(YAxis, { stroke: "#94A3B8", fontSize: 11, tickLine: false, axisLine: false }), _jsx(RTooltip, { contentStyle: {
                                                            background: "#111827",
                                                            border: "1px solid #1F2937",
                                                            borderRadius: 12,
                                                            fontSize: 12,
                                                        } }), _jsx(Area, { type: "monotone", dataKey: "leads", stroke: "#7C5CFF", strokeWidth: 2, fill: "url(#gLeads)" }), _jsx(Area, { type: "monotone", dataKey: "emails", stroke: "#22D3EE", strokeWidth: 2, fill: "url(#gEmails)" })] }) }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { children: [_jsx(CardTitle, { children: "POS breakdown" }), _jsx(CardDescription, { children: "Detected systems across leads" })] }) }), _jsx(CardContent, { className: "h-72 flex flex-col", children: posShare.length === 0 ? (_jsx("div", { className: "flex-1 grid place-items-center text-muted-foreground text-sm", children: "No POS detected yet" })) : (_jsxs(_Fragment, { children: [_jsx(ResponsiveContainer, { width: "100%", height: "70%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: posShare, dataKey: "value", cx: "50%", cy: "50%", innerRadius: 48, outerRadius: 74, paddingAngle: 3, stroke: "none", children: posShare.map((_, i) => (_jsx(Cell, { fill: COLORS[i % COLORS.length] }, i))) }), _jsx(RTooltip, { contentStyle: {
                                                                    background: "#111827",
                                                                    border: "1px solid #1F2937",
                                                                    borderRadius: 12,
                                                                    fontSize: 12,
                                                                } })] }) }), _jsx("div", { className: "mt-2 space-y-1.5", children: posShare.map((p, i) => (_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "h-2 w-2 rounded-full", style: { background: COLORS[i % COLORS.length] } }), _jsx("span", { className: "text-foreground", children: p.name })] }), _jsx("span", { className: "text-muted-foreground", children: p.value })] }, p.name))) })] })) })] })] }), _jsxs("div", { className: "grid grid-cols-1 xl:grid-cols-3 gap-4", children: [_jsxs(Card, { className: "xl:col-span-2", children: [_jsx(CardHeader, { children: _jsxs("div", { children: [_jsx(CardTitle, { children: "Top industries" }), _jsx(CardDescription, { children: "Volume of leads by search query" })] }) }), _jsx(CardContent, { className: "h-64", children: byIndustry.length === 0 ? (_jsx("div", { className: "h-full grid place-items-center text-muted-foreground text-sm", children: "No data yet \u2014 start your first scrape" })) : (_jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: byIndustry, margin: { top: 8, right: 0, left: -20, bottom: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "gBar", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#7C5CFF" }), _jsx("stop", { offset: "100%", stopColor: "#22D3EE" })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1F2937" }), _jsx(XAxis, { dataKey: "name", stroke: "#94A3B8", fontSize: 11, tickLine: false }), _jsx(YAxis, { stroke: "#94A3B8", fontSize: 11, tickLine: false, axisLine: false }), _jsx(RTooltip, { contentStyle: {
                                                            background: "#111827",
                                                            border: "1px solid #1F2937",
                                                            borderRadius: 12,
                                                            fontSize: 12,
                                                        } }), _jsx(Bar, { dataKey: "count", fill: "url(#gBar)", radius: [8, 8, 2, 2] })] }) })) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Recent activity" }), _jsx(CardDescription, { children: "Last scrape jobs" })] }), _jsx(Link, { to: "/history", children: _jsxs(Button, { variant: "ghost", size: "sm", children: ["All ", _jsx(ArrowRight, { className: "h-3.5 w-3.5" })] }) })] }), _jsxs(CardContent, { className: "space-y-3", children: [tasks.length === 0 && (_jsxs("div", { className: "text-sm text-muted-foreground text-center py-8", children: [_jsx(Sparkles, { className: "h-5 w-5 mx-auto mb-2 text-primary" }), "Run your first scrape to see activity."] })), tasks.slice(0, 5).map((t) => (_jsxs("div", { className: "flex items-start gap-3 rounded-xl border border-border/50 p-3 bg-surface-2/40", children: [_jsx("div", { className: "h-8 w-8 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0", children: _jsx(Sparkles, { className: "h-3.5 w-3.5" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-sm font-medium truncate", children: t.search_term }), _jsxs("div", { className: "text-xs text-muted-foreground truncate", children: [t.zip_codes, " \u00B7 ", formatDate(t.created_at)] })] }), _jsx(Badge, { variant: t.status === "Running"
                                                            ? "default"
                                                            : t.status === "Completed"
                                                                ? "success"
                                                                : t.status === "Failed"
                                                                    ? "danger"
                                                                    : "muted", children: t.status })] }, t.job_id)))] })] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: (() => {
                            const mini = byDay.reduce((acc, cur, i) => {
                                const prev = i > 0 ? acc[i - 1].cum : 0;
                                acc.push({ ...cur, cum: prev + cur.leads });
                                return acc;
                            }, []);
                            const charts = [
                                { label: "Emails found", key: "emails", color: "#22D3EE" },
                                { label: "Leads per day", key: "leads", color: "#7C5CFF" },
                                { label: "Cumulative", key: "cum", color: "#34D399" },
                            ];
                            return charts.map((m) => (_jsx(Card, { className: "card-hover", children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: m.label }), _jsx(Badge, { variant: "muted", children: "14d" })] }), _jsx("div", { className: "h-14 mt-2", children: _jsx(ResponsiveContainer, { children: _jsx(LineChart, { data: mini, children: _jsx(Line, { type: "monotone", dataKey: m.key, stroke: m.color, strokeWidth: 2, dot: false }) }) }) })] }) }, m.label)));
                        })() })] })] }));
}
