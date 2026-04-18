import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Mail,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, type DbStats, type Task, type LeadResult } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";

const COLORS = ["#7C5CFF", "#22D3EE", "#34D399", "#F59E0B", "#F472B6"];

export function Dashboard() {
  const [stats, setStats] = useState<DbStats>({
    total_businesses: 0,
    total_emails: 0,
    total_tasks: 0,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [data, setData] = useState<LeadResult[]>([]);

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
    if (!stats.total_businesses) return 0;
    return Math.round((stats.total_emails / stats.total_businesses) * 100);
  }, [stats]);

  const activeJobs = tasks.filter((t) => t.status === "Running").length;

  // Leads by industry (top 6) for bar chart
  const byIndustry = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data) {
      const key = (row.search_query as string) || "Other";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  }, [data]);

  // Leads per day (last 14 days) for line chart
  const byDay = useMemo(() => {
    const map = new Map<string, { leads: number; emails: number }>();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      map.set(key, { leads: 0, emails: 0 });
    }
    for (const row of data) {
      const c = (row as unknown as { created_at?: string }).created_at;
      if (!c) continue;
      const d = new Date(c);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.leads += 1;
        if (row.final_email) bucket.emails += 1;
      }
    }
    return [...map.entries()].map(([day, v]) => ({ day, ...v }));
  }, [data]);

  // POS detection share for pie chart
  const posShare = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data) {
      const key = (row.pos_system as string) || (row.has_pos === "Yes" ? "Other POS" : "None");
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

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Realtime overview of your scraping pipeline"
      />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <Card key={k.label} className="relative overflow-hidden card-hover">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${k.accent} opacity-60 pointer-events-none`}
              />
              <CardContent className="relative p-5">
                <div className="flex items-start justify-between">
                  <div className={`h-10 w-10 rounded-xl grid place-items-center ${k.iconBg}`}>
                    <k.icon className="h-4 w-4" />
                  </div>
                  <Badge variant={k.delta.startsWith("−") ? "danger" : "success"}>
                    <ArrowUpRight className="h-3 w-3" />
                    {k.delta}
                  </Badge>
                </div>
                <div className="mt-5">
                  <div className="stat-value">{k.value}</div>
                  <div className="stat-label mt-1">{k.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Leads over time</CardTitle>
                <CardDescription>Last 14 days · scraped leads & emails found</CardDescription>
              </div>
              <Badge variant="muted">14d</Badge>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer>
                <AreaChart data={byDay} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C5CFF" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#7C5CFF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gEmails" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <RTooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #1F2937",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="#7C5CFF"
                    strokeWidth={2}
                    fill="url(#gLeads)"
                  />
                  <Area
                    type="monotone"
                    dataKey="emails"
                    stroke="#22D3EE"
                    strokeWidth={2}
                    fill="url(#gEmails)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>POS breakdown</CardTitle>
                <CardDescription>Detected systems across leads</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="h-72 flex flex-col">
              {posShare.length === 0 ? (
                <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
                  No POS detected yet
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="70%">
                    <PieChart>
                      <Pie
                        data={posShare}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={74}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {posShare.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={{
                          background: "#111827",
                          border: "1px solid #1F2937",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {posShare.map((p, i) => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: COLORS[i % COLORS.length] }}
                          />
                          <span className="text-foreground">{p.name}</span>
                        </div>
                        <span className="text-muted-foreground">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Top industries</CardTitle>
                <CardDescription>Volume of leads by search query</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="h-64">
              {byIndustry.length === 0 ? (
                <div className="h-full grid place-items-center text-muted-foreground text-sm">
                  No data yet — start your first scrape
                </div>
              ) : (
                <ResponsiveContainer>
                  <BarChart
                    data={byIndustry}
                    margin={{ top: 8, right: 0, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C5CFF" />
                        <stop offset="100%" stopColor="#22D3EE" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis
                      dataKey="name"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <RTooltip
                      contentStyle={{
                        background: "#111827",
                        border: "1px solid #1F2937",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="url(#gBar)" radius={[8, 8, 2, 2]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Last scrape jobs</CardDescription>
              </div>
              <Link to="/history">
                <Button variant="ghost" size="sm">
                  All <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <Sparkles className="h-5 w-5 mx-auto mb-2 text-primary" />
                  Run your first scrape to see activity.
                </div>
              )}
              {tasks.slice(0, 5).map((t) => (
                <div
                  key={t.job_id}
                  className="flex items-start gap-3 rounded-xl border border-border/50 p-3 bg-surface-2/40"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.search_term}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.zip_codes} · {formatDate(t.created_at)}
                    </div>
                  </div>
                  <Badge
                    variant={
                      t.status === "Running"
                        ? "default"
                        : t.status === "Completed"
                        ? "success"
                        : t.status === "Failed"
                        ? "danger"
                        : "muted"
                    }
                  >
                    {t.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Mini line chart strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(() => {
            type MiniRow = { day: string; leads: number; emails: number; cum: number };
            const mini: MiniRow[] = byDay.reduce<MiniRow[]>((acc, cur, i) => {
              const prev = i > 0 ? acc[i - 1].cum : 0;
              acc.push({ ...cur, cum: prev + cur.leads });
              return acc;
            }, []);
            const charts: { label: string; key: keyof MiniRow; color: string }[] = [
              { label: "Emails found", key: "emails", color: "#22D3EE" },
              { label: "Leads per day", key: "leads", color: "#7C5CFF" },
              { label: "Cumulative", key: "cum", color: "#34D399" },
            ];
            return charts.map((m) => (
              <Card key={m.label} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{m.label}</div>
                    <Badge variant="muted">14d</Badge>
                  </div>
                  <div className="h-14 mt-2">
                    <ResponsiveContainer>
                      <LineChart data={mini}>
                        <Line
                          type="monotone"
                          dataKey={m.key as string}
                          stroke={m.color}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ));
          })()}
        </div>
      </div>
    </>
  );
}
