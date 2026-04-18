import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-auto rounded-xl border border-border/60">
    <table ref={ref} className={cn("w-full text-sm caption-bottom", className)} {...props} />
  </div>
));
Table.displayName = "Table";

export const THead = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("bg-surface-2/80 text-xs uppercase tracking-wider", className)} {...props} />
);
export const TBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("divide-y divide-border/50", className)} {...props} />
);
export const TR = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("hover:bg-surface/60 transition-colors", className)} {...props} />
);
export const TH = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap",
      className
    )}
    {...props}
  />
);
export const TD = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3 text-foreground", className)} {...props} />
);
