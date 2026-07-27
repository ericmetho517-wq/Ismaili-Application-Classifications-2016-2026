import { LangToggle } from "./LangToggle";
import { useI18n } from "@/lib/i18n";

export function TopBar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { t } = useI18n();

  return (
    <header
      dir="ltr"
      className="glass surface-hover mb-1.5 grid min-w-0 shrink-0 grid-cols-1 items-center gap-2 rounded-lg px-3 py-2 md:grid-cols-[minmax(150px,1fr)_minmax(0,3fr)_minmax(150px,1fr)] md:px-4"
    >
      <div className="min-w-0 text-center md:col-start-2 md:row-start-1">
        {title ? (
          <h1
            dir="auto"
            className="text-balance text-sm font-extrabold leading-tight text-foreground sm:text-base"
          >
            {title}
          </h1>
        ) : (
          <h1
            dir="rtl"
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-sm font-extrabold leading-tight text-foreground sm:text-base"
          >
            <span>{t.appName}</span>
            <span aria-hidden="true" className="text-[var(--brand)]">
              —
            </span>
            <span dir="ltr">Land Use &amp; Urban Change Analytics 2016–2026</span>
          </h1>
        )}
        <p
          dir="auto"
          className="mx-auto mt-0.5 line-clamp-2 max-w-3xl text-[10px] leading-tight text-muted-foreground sm:text-[11px]"
        >
          {subtitle ?? t.appSubtitle}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2 md:col-start-1 md:row-start-1 md:justify-self-start">
        <div className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Live data
        </div>
        <LangToggle />
      </div>
    </header>
  );
}
