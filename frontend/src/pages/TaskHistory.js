import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Download, Trash2, RefreshCw, Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { downloadBlob, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
export function TaskHistory() {
    const { toast } = useToast();
    const [tasks, setTasks] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [search, setSearch] = useState("");
    const [toDelete, setToDelete] = useState(null);
    const [loading, setLoading] = useState(false);
    async function load() {
        setLoading(true);
        try {
            const t = await api.getTasks();
            setTasks(t.tasks);
        }
        catch (e) {
            toast(`Failed to load tasks: ${e.message}`, "error");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
    }, []);
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return tasks;
        return tasks.filter((t) => t.search_term.toLowerCase().includes(q) ||
            t.zip_codes.toLowerCase().includes(q) ||
            t.job_id.toLowerCase().includes(q));
    }, [tasks, search]);
    function toggleOne(id) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    }
    function toggleAll() {
        setSelected((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.job_id)));
    }
    async function downloadOne(id) {
        try {
            const blob = await api.exportTaskBlob(id, "csv");
            downloadBlob(blob, `task_${id}.csv`);
        }
        catch (e) {
            toast(`Download failed: ${e.message}`, "error");
        }
    }
    async function downloadSelected() {
        const ids = [...selected];
        if (ids.length === 0)
            return;
        try {
            const blob = await api.bulkExportTasksBlob(ids);
            downloadBlob(blob, `tasks_bulk_${ids.length}.zip`);
        }
        catch (e) {
            toast(`Bulk download failed: ${e.message}`, "error");
        }
    }
    async function confirmDelete() {
        if (!toDelete)
            return;
        try {
            if (toDelete.length === 1) {
                await api.deleteTask(toDelete[0]);
            }
            else {
                await api.bulkDeleteTasks(toDelete);
            }
            toast(`Deleted ${toDelete.length} task${toDelete.length > 1 ? "s" : ""}`, "success");
            setSelected(new Set());
            setToDelete(null);
            load();
        }
        catch (e) {
            toast(`Delete failed: ${e.message}`, "error");
        }
    }
    const allSelected = filtered.length > 0 && selected.size === filtered.length;
    return (_jsxs(_Fragment, { children: [_jsx(Header, { title: "Task History", subtitle: "Persistent history of every scrape job" }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsx(Card, { children: _jsxs(CardContent, { className: "p-4 flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: "flex-1 min-w-[220px] relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Search by term, zip, or job ID\u2026", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-9" })] }), _jsxs(Button, { variant: "ghost", size: "sm", onClick: load, children: [_jsx(RefreshCw, { className: `h-4 w-4 ${loading ? "animate-spin" : ""}` }), "Refresh"] }), _jsxs(Button, { variant: "secondary", onClick: downloadSelected, disabled: selected.size === 0, children: [_jsx(Download, { className: "h-4 w-4" }), " Download (", selected.size, ")"] }), _jsxs(Button, { variant: "destructive", onClick: () => setToDelete([...selected]), disabled: selected.size === 0, children: [_jsx(Trash2, { className: "h-4 w-4" }), " Delete (", selected.size, ")"] })] }) }), _jsx(Card, { children: _jsx(CardContent, { className: "p-0", children: _jsxs(Table, { children: [_jsx(THead, { children: _jsxs(TR, { children: [_jsx(TH, { className: "w-10", children: _jsx(Checkbox, { checked: allSelected, onCheckedChange: toggleAll }) }), _jsx(TH, { children: "Search" }), _jsx(TH, { children: "Zip codes" }), _jsx(TH, { children: "Status" }), _jsx(TH, { children: "Results" }), _jsx(TH, { children: "Created" }), _jsx(TH, { className: "text-right", children: "Actions" })] }) }), _jsxs(TBody, { children: [loading && (_jsx(TR, { children: _jsx(TD, { colSpan: 7, className: "py-10 text-center text-muted-foreground", children: "Loading\u2026" }) })), !loading && filtered.length === 0 && (_jsx(TR, { children: _jsx(TD, { colSpan: 7, className: "py-10 text-center text-muted-foreground", children: "No tasks yet. Run your first scrape to see it here." }) })), filtered.map((t) => (_jsxs(TR, { children: [_jsx(TD, { children: _jsx(Checkbox, { checked: selected.has(t.job_id), onCheckedChange: () => toggleOne(t.job_id) }) }), _jsx(TD, { className: "font-medium max-w-[280px] truncate", children: t.search_term }), _jsx(TD, { className: "text-muted-foreground max-w-[220px] truncate", children: t.zip_codes }), _jsx(TD, { children: _jsx(Badge, { variant: t.status === "Running"
                                                                ? "default"
                                                                : t.status === "Completed"
                                                                    ? "success"
                                                                    : t.status === "Failed"
                                                                        ? "danger"
                                                                        : "muted", children: t.status }) }), _jsx(TD, { className: "tabular-nums", children: t.total_results ?? 0 }), _jsx(TD, { className: "text-xs text-muted-foreground whitespace-nowrap", children: formatDate(t.created_at) }), _jsx(TD, { className: "text-right", children: _jsxs("div", { className: "flex items-center justify-end gap-1", children: [_jsx(Button, { variant: "ghost", size: "icon", onClick: () => downloadOne(t.job_id), children: _jsx(Download, { className: "h-4 w-4" }) }), _jsx(Button, { variant: "ghost", size: "icon", onClick: () => setToDelete([t.job_id]), children: _jsx(Trash2, { className: "h-4 w-4 text-red-400" }) })] }) })] }, t.job_id)))] })] }) }) })] }), _jsx(Dialog, { open: !!toDelete, onOpenChange: (o) => !o && setToDelete(null), children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { children: ["Delete ", toDelete?.length ?? 0, " task", (toDelete?.length ?? 0) > 1 ? "s" : "", "?"] }), _jsxs(DialogDescription, { children: ["This will permanently remove the task", (toDelete?.length ?? 0) > 1 ? "s" : "", " and", " ", _jsx("span", { className: "text-red-300 font-medium", children: "all associated leads" }), " from the database (cascade). This cannot be undone."] })] }), _jsxs(DialogFooter, { children: [_jsx(DialogClose, { asChild: true, children: _jsx(Button, { variant: "secondary", children: "Cancel" }) }), _jsxs(Button, { variant: "destructive", onClick: confirmDelete, children: [_jsx(Trash2, { className: "h-4 w-4" }), " Delete permanently"] })] })] }) })] }));
}
