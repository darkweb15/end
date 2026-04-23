import { useEffect, useRef, useState } from "react";
import { Mail, Play, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { api, type ReenrichStatus } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

type Props = {
  /** Called after a completed re-enrich job so the parent can refresh counts. */
  onCompleted?: () => void;
};

export function ReenrichPanel({ onCompleted }: Props) {
  const { toast } = useToast();
  const [total, setTotal] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [start, setStart] = useState<number>(1);
  const [end, setEnd] = useState<number>(25);
  const [job, setJob] = useState<ReenrichStatus | null>(null);
  const [running, setRunning] = useState(false);
  const pollRef = useRef<number | null>(null);

  async function loadCount() {
    setLoadingCount(true);
    try {
      const { count } = await api.getMissingEmailsCount();
      setTotal(count);
      // Auto-fit default range if it's obviously out of bounds.
      if (count > 0 && end > count) setEnd(Math.min(count, 50));
    } catch (e) {
      toast(`Failed to load count: ${(e as Error).message}`, "error");
    } finally {
      setLoadingCount(false);
    }
  }

  useEffect(() => {
    loadCount();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleStart() {
    if (start < 1 || end < start) {
      toast("Enter a valid range (start ≥ 1, end ≥ start).", "error");
      return;
    }
    if (total != null && start > total) {
      toast(`Start index is past the last missing-email row (${total}).`, "error");
      return;
    }
    stopPolling();
    setRunning(true);
    try {
      const { job_id } = await api.startReenrich(start, end);
      // Seed an empty status so the progress bar shows up immediately.
      setJob({
        job_id,
        start_index: start,
        end_index: end,
        status: "running",
        total: 0,
        processed: 0,
        updated: 0,
        no_email_found: 0,
        errors: [],
        started_at: "",
        finished_at: "",
        sample_updates: [],
      });

      pollRef.current = window.setInterval(async () => {
        try {
          const s = await api.getReenrichJob(job_id);
          setJob(s);
          if (s.status === "completed" || s.status === "failed") {
            stopPolling();
            setRunning(false);
            if (s.status === "completed") {
              toast(
                `Re-enrich done: ${s.updated} emails found / ${s.total} checked.`,
                "success"
              );
            } else {
              toast("Re-enrich job failed. See errors below.", "error");
            }
            loadCount();
            onCompleted?.();
          }
        } catch (e) {
          // keep polling; transient errors are OK
          console.warn("poll error", e);
        }
      }, 1500);
    } catch (e) {
      setRunning(false);
      toast(`Failed to start: ${(e as Error).message}`, "error");
    }
  }

  const pct =
    job && job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Re-enrich missing emails
          </CardTitle>
          <CardDescription>
            Leads saved without an email still have a website — re-run just the
            email extractor over a specific index range. Existing rows are
            updated in place. No duplicates, no Google Maps re-scrape.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="muted">
            {loadingCount
              ? "…"
              : total != null
              ? `${total.toLocaleString()} leads missing email`
              : "—"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadCount}
            disabled={loadingCount}
            title="Refresh count"
          >
            <RefreshCw className={`h-4 w-4 ${loadingCount ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <Label htmlFor="reenrich-start">From index</Label>
            <Input
              id="reenrich-start"
              type="number"
              min={1}
              max={total ?? undefined}
              value={start}
              onChange={(e) => setStart(Math.max(1, Number(e.target.value) || 1))}
              disabled={running}
            />
          </div>
          <div>
            <Label htmlFor="reenrich-end">To index</Label>
            <Input
              id="reenrich-end"
              type="number"
              min={start}
              max={total ?? undefined}
              value={end}
              onChange={(e) => setEnd(Math.max(start, Number(e.target.value) || start))}
              disabled={running}
            />
          </div>
          <Button onClick={handleStart} disabled={running} className="h-10">
            <Play className="h-4 w-4" />
            {running ? "Running…" : "Re-enrich emails"}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Indexing is by <code className="font-mono">id</code> ASC and matches the
          first {total ? total.toLocaleString() : "N"} rows that don't have an
          email yet. Max 1000 per run.
        </div>

        {job && (
          <div className="rounded-xl border border-border/60 bg-surface-2/40 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="font-medium">
                Job <span className="font-mono text-xs">{job.job_id}</span> ·{" "}
                <Badge
                  variant={
                    job.status === "completed"
                      ? "success"
                      : job.status === "failed"
                      ? "muted"
                      : "cyan"
                  }
                >
                  {job.status}
                </Badge>
              </div>
              <div className="text-muted-foreground text-xs">
                range {job.start_index}–{job.end_index}
              </div>
            </div>
            <Progress value={pct} />
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <Stat label="Checked" value={`${job.processed}/${Math.max(job.total, job.processed)}`} />
              <Stat
                label="Emails found"
                value={String(job.updated)}
                tone="emerald"
              />
              <Stat
                label="No email"
                value={String(job.no_email_found)}
                tone="muted"
              />
            </div>
            {job.sample_updates.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-muted-foreground">
                  Latest finds:
                </div>
                {job.sample_updates.slice(-5).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-2 text-xs truncate"
                  >
                    <Mail className="h-3 w-3 text-emerald-300 flex-shrink-0" />
                    <span className="truncate font-medium">{u.name}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="truncate text-emerald-300">{u.email}</span>
                  </div>
                ))}
              </div>
            )}
            {job.errors.length > 0 && (
              <div className="mt-2 text-xs text-amber-300/90">
                {job.errors.slice(-3).map((err, i) => (
                  <div key={i} className="truncate">
                    · {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "emerald" | "muted";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "muted"
      ? "text-muted-foreground"
      : "text-foreground";
  return (
    <div className="rounded-lg bg-surface/60 border border-border/50 p-2">
      <div className={`text-base font-semibold ${color}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
