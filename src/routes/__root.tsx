import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { dict, LangContext, type Lang } from "../lib/i18n";
import { THEME_STORAGE_KEY, ThemeContext, type Theme } from "../lib/theme";
import { Sidebar } from "../components/Sidebar";
import { MobileNav } from "../components/MobileNav";
import logoUrl from "../assets/logo.png";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Ismailia Geo Dashboard | لوحة الإسماعيلية الجغرافية" },
      {
        name: "description",
        content:
          "Interactive geospatial dashboard for Ismailia, Egypt — compare 2016 vs 2026 land use across urban, agricultural, industrial, and water sectors along the development axis.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Ismailia Geo Dashboard" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/XqELMWNTW3PhFTUX3uHrFg8C7x22/social-images/social-1780385998381-OIP.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/XqELMWNTW3PhFTUX3uHrFg8C7x22/social-images/social-1780385998381-OIP.webp",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: logoUrl },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center text-foreground">
      <p>404 — Not found</p>
    </div>
  ),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [lang, setLang] = useState<Lang>("ar");
  const [theme, setTheme] = useState<Theme>("light");
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("light", theme === "light");
    document.body.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <LangContext.Provider value={{ lang, setLang, t: dict[lang], dir }}>
          <div
            className="dashboard-shell flex h-[100dvh] min-h-0 w-full max-w-full gap-1 overflow-hidden p-1 sm:gap-2 sm:p-2"
            dir={dir}
          >
            <Sidebar />
            <main className="dashboard-main flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain pb-16 md:pb-0">
              <Outlet />
            </main>
            <MobileNav />
          </div>
        </LangContext.Provider>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}
