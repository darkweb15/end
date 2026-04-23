import { useEffect, useMemo, useState } from "react";
import { Download, Filter, Mail, Phone, Globe, MapPin, Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ReenrichPanel } from "@/components/ReenrichPanel";
import { api, type LeadResult } from "@/lib/api";
import { downloadBlob } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export function Results() {
  const { toast } = useToast();
  const [industries, setIndustries] = useState<string[]>([]);
  const [industry, setIndustry] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "email" | "pos" | "website">("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<LeadResult[]>([]);
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
    } catch (e) {
      toast(`Failed to load: ${(e as Error).message}`, "error");
    } finally {
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
      if (filter === "email" && !row.final_email) return false;
      if (filter === "pos" && row.has_pos !== "Yes") return false;
      if (filter === "website" && !row.website) return false;
      if (!q) return true;
      return (
        row.name?.toLowerCase().includes(q) ||
        row.address?.toLowerCase().includes(q) ||
        row.final_email?.toLowerCase().includes(q) ||
        row.phone?.toLowerCase().includes(q)
      );
    });
  }, [data, filter, search]);

  async function exportAll() {
    const res = await fetch(
      `/api/export-db/csv${industry ? `?industry=${encodeURIComponent(industry)}` : ""}`
    );
    const blob = await res.blob();
    downloadBlob(blob, `leads${industry ? "_" + industry : ""}.csv`);
  }

  return (
    <>
      <Header title="Results" subtitle="All business leads saved in Supabase" />
      <div className="p-6 space-y-4">
        <ReenrichPanel onCompleted={() => load()} />
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name / email / address / phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                load(e.target.value);
              }}
              className="h-10 rounded-xl border border-border/70 bg-surface/70 px-3 text-sm focus:outline-none focus:border-primary/60"
            >
              <option value="">All industries</option>
              {industries.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 p-1 rounded-xl border border-border/60 bg-surface/60">
              {(["all", "email", "pos", "website"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    filter === f
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All" : f === "email" ? "Has email" : f === "pos" ? "Has POS" : "Has website"}
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={exportAll}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Business</TH>
                  <TH>Contact</TH>
                  <TH>Location</TH>
                  <TH>Rating</TH>
                  <TH>POS</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {loading && (
                  <TR>
                    <TD colSpan={6} className="py-10 text-center text-muted-foreground">
                      Loading…
                    </TD>
                  </TR>
                )}
                {!loading && filtered.length === 0 && (
                  <TR>
                    <TD colSpan={6} className="py-10 text-center text-muted-foreground">
                      No matches.
                    </TD>
                  </TR>
                )}
                {filtered.slice(0, 500).map((row, i) => (
                  <TR key={i}>
                    <TD className="max-w-[260px]">
                      <div className="font-medium truncate">{row.name || "—"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {(row.search_query as string) || ""}
                      </div>
                    </TD>
                    <TD>
                      <div className="space-y-0.5 text-xs">
                        {row.final_email && (
                          <div className="flex items-center gap-1.5 text-emerald-300">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{row.final_email}</span>
                          </div>
                        )}
                        {row.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {row.phone}
                          </div>
                        )}
                        {row.website && (
                          <div className="flex items-center gap-1.5 text-cyan-300">
                            <Globe className="h-3 w-3" />
                            <a
                              href={row.website}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate max-w-[200px] hover:underline"
                            >
                              {row.website.replace(/^https?:\/\//, "")}
                            </a>
                          </div>
                        )}
                      </div>
                    </TD>
                    <TD className="max-w-[220px]">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{row.address || "—"}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {row.city} {row.state}
                      </div>
                    </TD>
                    <TD className="text-muted-foreground whitespace-nowrap text-xs">
                      {row.rating ? `${row.rating} ★ · ${row.reviews_count}` : "—"}
                    </TD>
                    <TD>
                      {row.has_pos === "Yes" ? (
                        <Badge variant="cyan">{row.pos_system || "POS"}</Badge>
                      ) : (
                        <Badge variant="muted">—</Badge>
                      )}
                    </TD>
                    <TD>
                      <Badge variant={row.final_email ? "success" : "muted"}>
                        {row.final_email ? "Ready" : "Needs email"}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Filter className="h-3 w-3" />
          Showing {filtered.length.toLocaleString()} of {data.length.toLocaleString()} leads
          {filtered.length > 500 && ` · first 500 rendered`}
        </div>
      </div>
    </>
  );
}
