import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console; in production this could pipe to analytics
    console.error("ErrorBoundary caught:", error, errorInfo);
    // Best-effort log to interactions table (silent fail)
    try {
      import("@/utils/analytics").then(({ trackEvent }) => {
        trackEvent("client_error", {
          message: error.message?.slice(0, 200) || "unknown",
          stack: error.stack?.slice(0, 500) || "",
          path: window.location.pathname,
        });
      });
    } catch { /* ignore */ }
  }

  private handleReload = () => window.location.reload();

  public render() {
    if (this.state.hasError) {
      // Detect language from URL — error boundaries don't get the
      // language prop, but the user's path tells us.
      const path = typeof window !== "undefined" ? window.location.pathname : "/";
      const isRu = path.startsWith("/ru") || /\/(?:ru)(?:$|\/)/.test(path);
      const t = (en: string, ru: string) => (isRu ? ru : en);
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-heading font-bold text-foreground">
                {t("Something went wrong", "Что-то пошло не так")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t(
                  "The page hit an unexpected error. Try reloading — your data is safe.",
                  "Страница встретила неожиданную ошибку. Попробуйте перезагрузить — ваши данные не потеряны.",
                )}
              </p>
              {this.state.error?.message && (
                <p className="text-xs text-muted-foreground/60 font-mono mt-3 p-2 bg-muted rounded">
                  {this.state.error.message.slice(0, 120)}
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReload} variant="default" className="gap-2">
                <RotateCw className="h-4 w-4" /> {t("Reload page", "Перезагрузить")}
              </Button>
              <Button onClick={() => { window.location.href = isRu ? "/ru" : "/"; }} variant="outline" className="gap-2">
                <Home className="h-4 w-4" /> {t("Home", "Главная")}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
