import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { cn } from "@/lib/utils";
export const Input = React.forwardRef(({ className, ...props }, ref) => (_jsx("input", { ref: ref, className: cn("flex h-10 w-full rounded-xl border border-border/70 bg-surface/70 px-3.5 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50", className), ...props })));
Input.displayName = "Input";
export const Textarea = React.forwardRef(({ className, ...props }, ref) => (_jsx("textarea", { ref: ref, className: cn("flex min-h-[96px] w-full rounded-xl border border-border/70 bg-surface/70 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 resize-y", className), ...props })));
Textarea.displayName = "Textarea";
