import { useEffect, useRef, useState } from "react";
import {
  PlayCircle,
  Target,
  MapPin,
  Filter,
  Download,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { api, type JobStatus } from "@/lib/api";
import { downloadBlob } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export function Scraper() {
  const { toast } = useToast();
  const [searchTerms, setSearchTerms] = useState("wine stores");
  const [zipCodes, setZipCodes] = useState("94102 San Francisco CA USA");
  const [maxResults, setMaxResults] = useState(5);
  const [industry, setIndustry] = useState("All");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!jobId) return;
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
          } else {
            toast("Scrape failed — see errors below", "error");
          }
        }
      } catch (e) {
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
    } catch (e) {
      toast(`Failed to start: ${(e as Error).message}`, "error");
    }
  }

  async function downloadCsv() {
    if (!jobId) return;
    const blob = await api.exportJobBlob(jobId, "csv");
    downloadBlob(blob, `leads_${jobId}.csv`);
  }

  const isRunning = job?.status === "running";
  const completed = job?.completed ?? 0;
  const total = job?.total ?? 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : isRunning ? 5 : 0;
  const emailsFound = job?.results?.filter((r) => r.final_email).length ?? 0;
  const posFound = job?.results?.filter((r) => r.has_pos === "Yes").length ?? 0;

  return (
    <>
      <Header title="Scraper" subtitle="Run a new scrape — dedup by place_id across history" />
      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-1 self-start">
          <CardHeader>
            <div>
              <CardTitle>New Scrape Job</CardTitle>
              <CardDescription>Configure what and where to scrape</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" /> Search terms
              </Label>
              <Textarea
                rows={3}
                value={searchTerms}
                onChange={(e) => setSearchTerms(e.target.value)}
                placeholder="One per line, e.g.&#10;wine stores&#10;coffee shops"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Zip codes
              </Label>
              <Textarea
                rows={3}
                value={zipCodes}
                onChange={(e) => setZipCodes(e.target.value)}
                placeholder="One per line — e.g. 94102 San Francisco CA USA"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max results</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={maxResults}
                  onChange={(e) => setMaxResults(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" /> Industry
                </Label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-border/70 bg-surface/70 px-3 text-sm focus:outline-none focus:border-primary/60"
                >
                  <option>All</option>
                  <option>Restaurant</option>
                  <option>Retail</option>
                  <option>Hospitality</option>
                  <option>Services</option>
                </select>
              </div>
            </div>
            <Button
              onClick={handleStart}
              disabled={isRunning}
              size="lg"
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Scraping…
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" /> Start Scraper
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Progress</CardTitle>
              <CardDescription>
                {job
                  ? `Job ${job.job_id} · ${job.status}`
                  : "Idle — start a scrape to see live progress"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {jobId && job?.status === "completed" && (
                <Button variant="secondary" size="sm" onClick={downloadCsv}>
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              )}
              {isRunning && (
                <Badge variant="default">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
                  Live
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {completed} / {total || "—"} combinations
                {typeof job?.skipped_duplicates === "number" && job.skipped_duplicates > 0 && (
                  <> · skipped {job.skipped_duplicates} duplicates</>
                )}
              </span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <Progress value={progress} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <MiniStat
                label="Results"
                value={String(job?.results_count ?? 0)}
                icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
              />
              <MiniStat
                label="Emails"
                value={String(emailsFound)}
                icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              />
              <MiniStat
                label="POS detected"
                value={String(posFound)}
                icon={<Target className="h-3.5 w-3.5 text-cyan-400" />}
              />
              <MiniStat
                label="Skipped"
                value={String(job?.skipped_duplicates ?? 0)}
                icon={<Filter className="h-3.5 w-3.5 text-amber-400" />}
              />
            </div>

            {job?.errors && job.errors.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Warnings</div>
                  {job.errors.slice(0, 3).map((e, i) => (
                    <div key={i} className="font-mono opacity-80 truncate">
                      {e}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Email</TH>
                    <TH>Phone</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {(job?.results ?? []).slice(0, 10).map((r, i) => (
                    <TR key={i}>
                      <TD className="max-w-[260px] truncate">{r.name || "—"}</TD>
                      <TD className="text-muted-foreground">
                        {r.final_email || (
                          <span className="opacity-50">—</span>
                        )}
                      </TD>
                      <TD className="text-muted-foreground">{r.phone || "—"}</TD>
                      <TD>
                        <Badge
                          variant={r.final_email ? "success" : r.has_pos === "Yes" ? "cyan" : "muted"}
                        >
                          {r.final_email ? "Email" : r.has_pos === "Yes" ? "POS" : "Basic"}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                  {(!job || job.results.length === 0) && (
                    <TR>
                      <TD colSpan={4} className="text-center text-muted-foreground py-8">
                        No results yet.
                      </TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-surface-2/40 px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span className="uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
