import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  // Detect language from URL prefix — Russian users on /ru,
  // /discover/ru, /pricing/ru, etc. get a Russian 404.
  const isRu = location.pathname.startsWith("/ru") ||
    /\/(?:ru)(?:$|\/)/.test(location.pathname);
  const t = (en: string, ru: string) => (isRu ? ru : en);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          {t("Page not found", "Страница не найдена")}
        </p>
        <a href={isRu ? "/ru" : "/"} className="text-gold-dark underline hover:text-gold">
          {t("Return to home", "Вернуться на главную")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
