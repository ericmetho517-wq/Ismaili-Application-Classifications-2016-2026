import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { useI18n } from "@/lib/i18n";

export function TopBar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { t } = useI18n();

  return (
    <header
      dir="ltr"
      className="dashboard-topbar glass surface-hover relative mb-2.5 grid min-h-[76px] min-w-0 shrink-0 grid-cols-1 items-center gap-2.5 rounded-xl px-4 py-3 shadow-lg md:grid-cols-[minmax(180px,1fr)_minmax(0,3fr)_minmax(180px,1fr)] md:px-5 md:py-3.5"
    >
      <div className="min-w-0 text-center md:col-start-2 md:row-start-1">
        {title ? (
          <h1
            dir="auto"
            className="mx-auto max-w-5xl py-0.5 text-balance text-center text-[clamp(1.55rem,2.1vw,2rem)] font-black leading-[1.35] text-foreground"
          >
            {title}
          </h1>
        ) : (
          <h1
            dir="rtl"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[clamp(1.25rem,1.7vw,1.6rem)] font-black leading-tight text-foreground"
          >
            <span className="text-[var(--brand)]">
              {t.appName}
            </span>
            <span aria-hidden="true" className="text-[var(--brand-2)]">
              —
            </span>
            <span dir="ltr" className="font-extrabold text-foreground/90">
              Land Use &amp; Urban Change Analytics 2016–2026
            </span>
          </h1>
        )}
        {(subtitle ?? t.appSubtitle).trim() && (
          <p
            dir="auto"
            className="mx-auto mt-1.5 line-clamp-2 max-w-4xl text-center text-sm font-bold leading-relaxed text-muted-foreground sm:text-base"
          >
            {subtitle ?? t.appSubtitle}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2 md:col-start-3 md:row-start-1 md:justify-self-end">
        <div className="flex items-center gap-1.5">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
