import { useEffect, useMemo, useState } from "react";
import { Download, Trash2, RefreshCw, Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { api, type Task } from "@/lib/api";
import { downloadBlob, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export function TaskHistory() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const t = await api.getTasks();
      setTasks(t.tasks);
    } catch (e) {
      toast(`Failed to load tasks: ${(e as Error).message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.search_term.toLowerCase().includes(q) ||
        t.zip_codes.toLowerCase().includes(q) ||
        t.job_id.toLowerCase().includes(q)
    );
  }, [tasks, search]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.job_id))
    );
  }

  async function downloadOne(id: string) {
    try {
      const blob = await api.exportTaskBlob(id, "csv");
      downloadBlob(blob, `task_${id}.csv`);
    } catch (e) {
      toast(`Download failed: ${(e as Error).message}`, "error");
    }
  }

  async function downloadSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    try {
      const blob = await api.bulkExportTasksBlob(ids);
      downloadBlob(blob, `tasks_bulk_${ids.length}.zip`);
    } catch (e) {
      toast(`Bulk download failed: ${(e as Error).message}`, "error");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      if (toDelete.length === 1) {
        await api.deleteTask(toDelete[0]);
      } else {
        await api.bulkDeleteTasks(toDelete);
      }
      toast(`Deleted ${toDelete.length} task${toDelete.length > 1 ? "s" : ""}`, "success");
      setSelected(new Set());
      setToDelete(null);
      load();
    } catch (e) {
      toast(`Delete failed: ${(e as Error).message}`, "error");
    }
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <>
      <Header title="Task History" subtitle="Persistent history of every scrape job" />
      <div className="p-6 space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by term, zip, or job ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={load}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={downloadSelected}
              disabled={selected.size === 0}
            >
              <Download className="h-4 w-4" /> Download ({selected.size})
            </Button>
            <Button
              variant="destructive"
              onClick={() => setToDelete([...selected])}
              disabled={selected.size === 0}
            >
              <Trash2 className="h-4 w-4" /> Delete ({selected.size})
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TH>
                  <TH>Search</TH>
                  <TH>Zip codes</TH>
                  <TH>Status</TH>
                  <TH>Results</TH>
                  <TH>Created</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {loading && (
                  <TR>
                    <TD colSpan={7} className="py-10 text-center text-muted-foreground">
                      Loading…
                    </TD>
                  </TR>
                )}
                {!loading && filtered.length === 0 && (
                  <TR>
                    <TD colSpan={7} className="py-10 text-center text-muted-foreground">
                      No tasks yet. Run your first scrape to see it here.
                    </TD>
                  </TR>
                )}
                {filtered.map((t) => (
                  <TR key={t.job_id}>
                    <TD>
                      <Checkbox
                        checked={selected.has(t.job_id)}
                        onCheckedChange={() => toggleOne(t.job_id)}
                      />
                    </TD>
                    <TD className="font-medium max-w-[280px] truncate">{t.search_term}</TD>
                    <TD className="text-muted-foreground max-w-[220px] truncate">
                      {t.zip_codes}
                    </TD>
                    <TD>
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
                    </TD>
                    <TD className="tabular-nums">{t.total_results ?? 0}</TD>
                    <TD className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(t.created_at)}
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => downloadOne(t.job_id)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDelete([t.job_id])}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {toDelete?.length ?? 0} task{(toDelete?.length ?? 0) > 1 ? "s" : ""}?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the task{(toDelete?.length ?? 0) > 1 ? "s" : ""} and{" "}
              <span className="text-red-300 font-medium">all associated leads</span> from the database
              (cascade). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" /> Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
