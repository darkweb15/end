import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
export const Progress = React.forwardRef(({ className, value = 0, ...props }, ref) => (_jsx(ProgressPrimitive.Root, { ref: ref, className: cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-2 border border-border/50", className), ...props, children: _jsx(ProgressPrimitive.Indicator, { className: "h-full w-full flex-1 bg-gradient-violet transition-all duration-300", style: { transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` } }) })));
Progress.displayName = "Progress";
