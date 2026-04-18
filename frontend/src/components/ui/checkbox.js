import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
export const Checkbox = React.forwardRef(({ className, ...props }, ref) => (_jsx(CheckboxPrimitive.Root, { ref: ref, className: cn("peer h-4 w-4 shrink-0 rounded border border-border/70 bg-surface/60 hover:border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors", className), ...props, children: _jsx(CheckboxPrimitive.Indicator, { className: "flex items-center justify-center text-white", children: _jsx(Check, { className: "h-3 w-3", strokeWidth: 3 }) }) })));
Checkbox.displayName = "Checkbox";
