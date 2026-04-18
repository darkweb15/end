import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Header({
  title,
  subtitle,
  search,
  onSearch,
}: {
  title: string;
  subtitle?: string;
  search?: string;
  onSearch?: (v: string) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/60 backdrop-blur-xl px-6 py-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="hidden sm:block flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search ?? ""}
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder="Search leads, tasks, emails…"
          className="pl-9 h-9"
        />
      </div>
      <button className="relative h-9 w-9 rounded-xl border border-border/70 bg-surface/70 hover:bg-surface-2 transition grid place-items-center">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
      </button>
      <div className="flex items-center gap-2 pl-2">
        <div className="h-9 w-9 rounded-full bg-gradient-ember grid place-items-center text-white text-sm font-semibold">
          B
        </div>
      </div>
    </header>
  );
}
