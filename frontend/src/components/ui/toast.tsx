import * as React from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; message: string; kind: ToastKind };

const ToastCtx = React.createContext<{
  toast: (msg: string, kind?: ToastKind) => void;
}>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
            {items.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-card backdrop-blur bg-surface/95 min-w-[260px] max-w-[420px] animate-in slide-in-from-right",
                  t.kind === "success" && "border-emerald-500/40",
                  t.kind === "error" && "border-red-500/50",
                  t.kind === "info" && "border-border"
                )}
              >
                {t.kind === "success" && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                )}
                {t.kind === "error" && (
                  <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                )}
                {t.kind === "info" && (
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                )}
                <div className="text-sm text-foreground leading-snug">{t.message}</div>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastCtx.Provider>
  );
}
