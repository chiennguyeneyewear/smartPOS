import { CheckCircle2, X, XCircle, Info } from "lucide-react";
import { useToastStore } from "@/stores/toast-store";
import { cn } from "@/lib/utils";

const ICONS = {
  default: Info,
  success: CheckCircle2,
  destructive: XCircle,
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant ?? "default"];
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border bg-card p-3 shadow-lg animate-in slide-in-from-bottom-2",
              t.variant === "success" && "border-success/30",
              t.variant === "destructive" && "border-destructive/30",
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                t.variant === "success" && "text-success",
                t.variant === "destructive" && "text-destructive",
                (!t.variant || t.variant === "default") && "text-primary",
              )}
            />
            <div className="flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
