import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { PlayCircle, Target, MapPin, Filter, Download, CheckCircle2, Loader2, AlertTriangle, Sparkles, } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
export function Scraper() {
    const { toast } = useToast();
    const [searchTerms, setSearchTerms] = useState("wine stores");
    const [zipCodes, setZipCodes] = useState("94102 San Francisco CA USA");
    const [maxResults, setMaxResults] = useState(5);
    const [industry, setIndustry] = useState("All");
    const [jobId, setJobId] = useState(null);
    const [job, setJob] = useState(null);
    const pollRef = useRef(null);
    useEffect(() => {
        if (!jobId)
            return;
        const poll = async () => {
            try {
                const s = await api.getJob(jobId);
                setJob(s);
                if (s.status === "completed" || s.status === "failed") {
                    if (pollRef.current) {
                        window.clearInterval(pollRef.current);
                        pollRef.current = null;
                    }
                    if (s.status === "completed") {
                        toast(`Scrape finished · ${s.results_count} leads`, "success");
                    }
                    else {
                        toast("Scrape failed — see errors below", "error");
                    }
                }
            }
            catch (e) {
                console.error(e);
            }
        };
        poll();
        pollRef.current = window.setInterval(poll, 2000);
        return () => {
            if (pollRef.current) {
                window.clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [jobId, toast]);
    async function handleStart() {
        const terms = searchTerms.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
        const zips = zipCodes.split(/\n/).map((s) => s.trim()).filter(Boolean);
        if (!terms.length || !zips.length) {
            toast("Please provide at least one search term and one zip code", "error");
            return;
        }
        try {
            setJob(null);
            const res = await api.startScrape({
                search_terms: terms,
                zip_codes: zips,
                max_results_per_search: maxResults,
            });
            setJobId(res.job_id);
            toast(`Scrape started · job ${res.job_id}`, "info");
        }
        catch (e) {
            toast(`Failed to start: ${e.message}`, "error");
        }
    }
    async function downloadCsv() {
        if (!jobId)
            return;
        const blob = await api.exportJobBlob(jobId, "csv");
        downloadBlob(blob, `leads_${jobId}.csv`);
    }
    const isRunning = job?.status === "running";
    const completed = job?.completed ?? 0;
    const total = job?.total ?? 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : isRunning ? 5 : 0;
    const emailsFound = job?.results?.filter((r) => r.final_email).length ?? 0;
    const posFound = job?.results?.filter((r) => r.has_pos === "Yes").length ?? 0;
    return (_jsxs(_Fragment, { children: [_jsx(Header, { title: "Scraper", subtitle: "Run a new scrape \u2014 dedup by place_id across history" }), _jsxs("div", { className: "p-6 grid grid-cols-1 xl:grid-cols-3 gap-4", children: [_jsxs(Card, { className: "xl:col-span-1 self-start", children: [_jsx(CardHeader, { children: _jsxs("div", { children: [_jsx(CardTitle, { children: "New Scrape Job" }), _jsx(CardDescription, { children: "Configure what and where to scrape" })] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsxs(Label, { className: "flex items-center gap-1.5", children: [_jsx(Target, { className: "h-3.5 w-3.5" }), " Search terms"] }), _jsx(Textarea, { rows: 3, value: searchTerms, onChange: (e) => setSearchTerms(e.target.value), placeholder: "One per line, e.g.\nwine stores\ncoffee shops" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs(Label, { className: "flex items-center gap-1.5", children: [_jsx(MapPin, { className: "h-3.5 w-3.5" }), " Zip codes"] }), _jsx(Textarea, { rows: 3, value: zipCodes, onChange: (e) => setZipCodes(e.target.value), placeholder: "One per line \u2014 e.g. 94102 San Francisco CA USA" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Max results" }), _jsx(Input, { type: "number", min: 1, max: 100, value: maxResults, onChange: (e) => setMaxResults(Math.max(1, Number(e.target.value) || 1)) })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs(Label, { className: "flex items-center gap-1.5", children: [_jsx(Filter, { className: "h-3.5 w-3.5" }), " Industry"] }), _jsxs("select", { value: industry, onChange: (e) => setIndustry(e.target.value), className: "flex h-10 w-full rounded-xl border border-border/70 bg-surface/70 px-3 text-sm focus:outline-none focus:border-primary/60", children: [_jsx("option", { children: "All" }), _jsx("option", { children: "Restaurant" }), _jsx("option", { children: "Retail" }), _jsx("option", { children: "Hospitality" }), _jsx("option", { children: "Services" })] })] })] }), _jsx(Button, { onClick: handleStart, disabled: isRunning, size: "lg", className: "w-full", children: isRunning ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), " Scraping\u2026"] })) : (_jsxs(_Fragment, { children: [_jsx(PlayCircle, { className: "h-4 w-4" }), " Start Scraper"] })) })] })] }), _jsxs(Card, { className: "xl:col-span-2", children: [_jsxs(CardHeader, { children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Progress" }), _jsx(CardDescription, { children: job
                                                    ? `Job ${job.job_id} · ${job.status}`
                                                    : "Idle — start a scrape to see live progress" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [jobId && job?.status === "completed" && (_jsxs(Button, { variant: "secondary", size: "sm", onClick: downloadCsv, children: [_jsx(Download, { className: "h-3.5 w-3.5" }), " CSV"] })), isRunning && (_jsxs(Badge, { variant: "default", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" }), "Live"] }))] })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [_jsxs("span", { children: [completed, " / ", total || "—", " combinations", typeof job?.skipped_duplicates === "number" && job.skipped_duplicates > 0 && (_jsxs(_Fragment, { children: [" \u00B7 skipped ", job.skipped_duplicates, " duplicates"] }))] }), _jsxs("span", { className: "tabular-nums", children: [progress, "%"] })] }), _jsx(Progress, { value: progress }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 pt-2", children: [_jsx(MiniStat, { label: "Results", value: String(job?.results_count ?? 0), icon: _jsx(Sparkles, { className: "h-3.5 w-3.5 text-primary" }) }), _jsx(MiniStat, { label: "Emails", value: String(emailsFound), icon: _jsx(CheckCircle2, { className: "h-3.5 w-3.5 text-emerald-400" }) }), _jsx(MiniStat, { label: "POS detected", value: String(posFound), icon: _jsx(Target, { className: "h-3.5 w-3.5 text-cyan-400" }) }), _jsx(MiniStat, { label: "Skipped", value: String(job?.skipped_duplicates ?? 0), icon: _jsx(Filter, { className: "h-3.5 w-3.5 text-amber-400" }) })] }), job?.errors && job.errors.length > 0 && (_jsxs("div", { className: "rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300 flex items-start gap-2", children: [_jsx(AlertTriangle, { className: "h-4 w-4 shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("div", { className: "font-semibold", children: "Warnings" }), job.errors.slice(0, 3).map((e, i) => (_jsx("div", { className: "font-mono opacity-80 truncate", children: e }, i)))] })] })), _jsx("div", { className: "pt-2", children: _jsxs(Table, { children: [_jsx(THead, { children: _jsxs(TR, { children: [_jsx(TH, { children: "Name" }), _jsx(TH, { children: "Email" }), _jsx(TH, { children: "Phone" }), _jsx(TH, { children: "Status" })] }) }), _jsxs(TBody, { children: [(job?.results ?? []).slice(0, 10).map((r, i) => (_jsxs(TR, { children: [_jsx(TD, { className: "max-w-[260px] truncate", children: r.name || "—" }), _jsx(TD, { className: "text-muted-foreground", children: r.final_email || (_jsx("span", { className: "opacity-50", children: "\u2014" })) }), _jsx(TD, { className: "text-muted-foreground", children: r.phone || "—" }), _jsx(TD, { children: _jsx(Badge, { variant: r.final_email ? "success" : r.has_pos === "Yes" ? "cyan" : "muted", children: r.final_email ? "Email" : r.has_pos === "Yes" ? "POS" : "Basic" }) })] }, i))), (!job || job.results.length === 0) && (_jsx(TR, { children: _jsx(TD, { colSpan: 4, className: "text-center text-muted-foreground py-8", children: "No results yet." }) }))] })] }) })] })] })] })] }));
}
function MiniStat({ label, value, icon, }) {
    return (_jsxs("div", { className: "rounded-xl border border-border/50 bg-surface-2/40 px-3 py-2.5", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [icon, _jsx("span", { className: "uppercase tracking-wider font-medium", children: label })] }), _jsx("div", { className: "text-xl font-bold mt-1 tabular-nums", children: value })] }));
}
