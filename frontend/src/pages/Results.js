import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Download, Filter, Mail, Phone, Globe, MapPin, Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
export function Results() {
    const { toast } = useToast();
    const [industries, setIndustries] = useState([]);
    const [industry, setIndustry] = useState("");
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    async function load(ind = industry) {
        setLoading(true);
        try {
            const [ds, ins] = await Promise.all([
                api.getData(ind, 5000),
                api.getIndustries(),
            ]);
            setData(ds.data);
            setIndustries(ins.industries);
        }
        catch (e) {
            toast(`Failed to load: ${e.message}`, "error");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return data.filter((row) => {
            if (filter === "email" && !row.final_email)
                return false;
            if (filter === "pos" && row.has_pos !== "Yes")
                return false;
            if (filter === "website" && !row.website)
                return false;
            if (!q)
                return true;
            return (row.name?.toLowerCase().includes(q) ||
                row.address?.toLowerCase().includes(q) ||
                row.final_email?.toLowerCase().includes(q) ||
                row.phone?.toLowerCase().includes(q));
        });
    }, [data, filter, search]);
    async function exportAll() {
        const res = await fetch(`/api/export-db/csv${industry ? `?industry=${encodeURIComponent(industry)}` : ""}`);
        const blob = await res.blob();
        downloadBlob(blob, `leads${industry ? "_" + industry : ""}.csv`);
    }
    return (_jsxs(_Fragment, { children: [_jsx(Header, { title: "Results", subtitle: "All business leads saved in Supabase" }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsx(Card, { children: _jsxs(CardContent, { className: "p-4 flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: "flex-1 min-w-[220px] relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Search name / email / address / phone\u2026", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-9" })] }), _jsxs("select", { value: industry, onChange: (e) => {
                                        setIndustry(e.target.value);
                                        load(e.target.value);
                                    }, className: "h-10 rounded-xl border border-border/70 bg-surface/70 px-3 text-sm focus:outline-none focus:border-primary/60", children: [_jsx("option", { value: "", children: "All industries" }), industries.map((i) => (_jsx("option", { value: i, children: i }, i)))] }), _jsx("div", { className: "flex items-center gap-1 p-1 rounded-xl border border-border/60 bg-surface/60", children: ["all", "email", "pos", "website"].map((f) => (_jsx("button", { onClick: () => setFilter(f), className: `px-3 py-1.5 text-xs font-medium rounded-lg transition ${filter === f
                                            ? "bg-primary/15 text-primary"
                                            : "text-muted-foreground hover:text-foreground"}`, children: f === "all" ? "All" : f === "email" ? "Has email" : f === "pos" ? "Has POS" : "Has website" }, f))) }), _jsxs(Button, { variant: "secondary", onClick: exportAll, children: [_jsx(Download, { className: "h-4 w-4" }), " Export CSV"] })] }) }), _jsx(Card, { children: _jsx(CardContent, { className: "p-0", children: _jsxs(Table, { children: [_jsx(THead, { children: _jsxs(TR, { children: [_jsx(TH, { children: "Business" }), _jsx(TH, { children: "Contact" }), _jsx(TH, { children: "Location" }), _jsx(TH, { children: "Rating" }), _jsx(TH, { children: "POS" }), _jsx(TH, { children: "Status" })] }) }), _jsxs(TBody, { children: [loading && (_jsx(TR, { children: _jsx(TD, { colSpan: 6, className: "py-10 text-center text-muted-foreground", children: "Loading\u2026" }) })), !loading && filtered.length === 0 && (_jsx(TR, { children: _jsx(TD, { colSpan: 6, className: "py-10 text-center text-muted-foreground", children: "No matches." }) })), filtered.slice(0, 500).map((row, i) => (_jsxs(TR, { children: [_jsxs(TD, { className: "max-w-[260px]", children: [_jsx("div", { className: "font-medium truncate", children: row.name || "—" }), _jsx("div", { className: "text-xs text-muted-foreground truncate", children: row.search_query || "" })] }), _jsx(TD, { children: _jsxs("div", { className: "space-y-0.5 text-xs", children: [row.final_email && (_jsxs("div", { className: "flex items-center gap-1.5 text-emerald-300", children: [_jsx(Mail, { className: "h-3 w-3" }), _jsx("span", { className: "truncate max-w-[200px]", children: row.final_email })] })), row.phone && (_jsxs("div", { className: "flex items-center gap-1.5 text-muted-foreground", children: [_jsx(Phone, { className: "h-3 w-3" }), row.phone] })), row.website && (_jsxs("div", { className: "flex items-center gap-1.5 text-cyan-300", children: [_jsx(Globe, { className: "h-3 w-3" }), _jsx("a", { href: row.website, target: "_blank", rel: "noreferrer", className: "truncate max-w-[200px] hover:underline", children: row.website.replace(/^https?:\/\//, "") })] }))] }) }), _jsxs(TD, { className: "max-w-[220px]", children: [_jsxs("div", { className: "flex items-center gap-1.5 text-xs text-muted-foreground truncate", children: [_jsx(MapPin, { className: "h-3 w-3" }), _jsx("span", { className: "truncate", children: row.address || "—" })] }), _jsxs("div", { className: "text-[11px] text-muted-foreground mt-0.5", children: [row.city, " ", row.state] })] }), _jsx(TD, { className: "text-muted-foreground whitespace-nowrap text-xs", children: row.rating ? `${row.rating} ★ · ${row.reviews_count}` : "—" }), _jsx(TD, { children: row.has_pos === "Yes" ? (_jsx(Badge, { variant: "cyan", children: row.pos_system || "POS" })) : (_jsx(Badge, { variant: "muted", children: "\u2014" })) }), _jsx(TD, { children: _jsx(Badge, { variant: row.final_email ? "success" : "muted", children: row.final_email ? "Ready" : "Needs email" }) })] }, i)))] })] }) }) }), _jsxs("div", { className: "text-xs text-muted-foreground flex items-center gap-2", children: [_jsx(Filter, { className: "h-3 w-3" }), "Showing ", filtered.length.toLocaleString(), " of ", data.length.toLocaleString(), " leads", filtered.length > 500 && ` · first 500 rendered`] })] })] }));
}
