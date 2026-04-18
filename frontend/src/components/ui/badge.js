import { jsx as _jsx } from "react/jsx-runtime";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border", {
    variants: {
        variant: {
            default: "border-primary/30 bg-primary/10 text-primary",
            success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
            warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
            danger: "border-red-500/30 bg-red-500/10 text-red-300",
            muted: "border-border bg-surface-2 text-muted-foreground",
            cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
        },
    },
    defaultVariants: { variant: "default" },
});
export function Badge({ className, variant, ...props }) {
    return _jsx("span", { className: cn(badgeVariants({ variant }), className), ...props });
}
