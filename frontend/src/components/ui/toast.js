import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
const ToastCtx = React.createContext({ toast: () => { } });
export function useToast() {
    return React.useContext(ToastCtx);
}
export function ToastProvider({ children }) {
    const [items, setItems] = React.useState([]);
    const toast = React.useCallback((message, kind = "info") => {
        const id = Date.now() + Math.random();
        setItems((prev) => [...prev, { id, message, kind }]);
        setTimeout(() => {
            setItems((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    }, []);
    return (_jsxs(ToastCtx.Provider, { value: { toast }, children: [children, typeof document !== "undefined" &&
                createPortal(_jsx("div", { className: "fixed bottom-5 right-5 z-[100] flex flex-col gap-2", children: items.map((t) => (_jsxs("div", { className: cn("flex items-start gap-3 rounded-xl border px-4 py-3 shadow-card backdrop-blur bg-surface/95 min-w-[260px] max-w-[420px] animate-in slide-in-from-right", t.kind === "success" && "border-emerald-500/40", t.kind === "error" && "border-red-500/50", t.kind === "info" && "border-border"), children: [t.kind === "success" && (_jsx(CheckCircle2, { className: "h-4 w-4 text-emerald-400 mt-0.5 shrink-0" })), t.kind === "error" && (_jsx(XCircle, { className: "h-4 w-4 text-red-400 mt-0.5 shrink-0" })), t.kind === "info" && (_jsx(Info, { className: "h-4 w-4 text-primary mt-0.5 shrink-0" })), _jsx("div", { className: "text-sm text-foreground leading-snug", children: t.message })] }, t.id))) }), document.body)] }));
}
