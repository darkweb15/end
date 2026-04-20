import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, KeyRound, Palette, Shield, Zap } from "lucide-react";

export function Settings({
  dbStatus,
}: {
  dbStatus: { connected: boolean; reason?: string } | null;
}) {
  return (
    <>
      <Header title="Settings" subtitle="Integrations and preferences" />
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" /> Supabase
              </CardTitle>
              <CardDescription>Postgres persistence layer</CardDescription>
            </div>
            <Badge variant={dbStatus?.connected ? "success" : "danger"}>
              {dbStatus?.connected ? "Connected" : "Offline"}
            </Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>
              Project URL:{" "}
              <code className="text-foreground">
                {dbStatus?.connected ? "configured" : "not configured"}
              </code>
            </div>
            <div>
              Service Role Key:{" "}
              <code className="text-foreground">
                {dbStatus?.connected ? "configured" : "missing"}
              </code>
            </div>
            {!dbStatus?.connected && dbStatus?.reason && (
              <div className="text-amber-300">Reason: {dbStatus.reason}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" /> Deduplication
              </CardTitle>
              <CardDescription>How we avoid re-scraping</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            At the start of every scrape, we query the database for every{" "}
            <code className="text-foreground">place_id</code> already known and skip them — across
            all zip codes and time. Only unique places are scraped and enriched.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-300" /> Concurrency
              </CardTitle>
              <CardDescription>Browser workers</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Configured via <code className="text-foreground">MAX_CONCURRENT_BROWSERS</code> env var
            on the server.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-cyan-300" /> Theme
              </CardTitle>
              <CardDescription>Premium dark only for now</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Background <code className="text-foreground">#0B0F19</code> · Surface{" "}
            <code className="text-foreground">#111827</code> · Accent{" "}
            <code className="text-foreground">#7C5CFF → #22D3EE</code>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-rose-300" /> API endpoints
              </CardTitle>
              <CardDescription>Backend routes used by the dashboard</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "POST  /api/scrape",
              "GET   /api/job/{id}",
              "GET   /api/tasks",
              "DELETE /api/tasks/{id}",
              "POST  /api/tasks/bulk-delete",
              "GET   /api/tasks/{id}/export/{fmt}",
              "POST  /api/tasks/bulk-export",
              "GET   /api/data",
              "GET   /api/industries",
              "GET   /api/stats",
              "GET   /api/db-status",
              "GET   /api/export-db/{fmt}",
            ].map((l) => (
              <div key={l} className="font-mono text-xs text-foreground bg-surface-2/50 rounded-lg px-3 py-2">
                {l}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
