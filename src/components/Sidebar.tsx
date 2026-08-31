import { Link, useRouterState } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import logoUrl from "@/assets/transport-ministry-logo.jpg";
import companyLogoUrl from "@/assets/company-logo.avif";
import { Banknote, Building2, Factory, Sprout } from "lucide-react";

export function Sidebar() {
  const { t, dir } = useI18n();
  const { location } = useRouterState();
  const items = [
    { to: "/prices", icon: Banknote, label: t.nav.prices },
    { to: "/urban", icon: Building2, label: t.nav.urban },
    { to: "/agricultural", icon: Sprout, label: t.nav.agricultural },
    { to: "/industrial", icon: Factory, label: t.nav.industrial },
  ];
  return (
    <aside className="glass hidden h-full min-h-0 w-14 shrink-0 flex-col items-center rounded-xl p-2 md:flex">
      <div
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-amber-300/70 bg-white shadow-[0_0_14px_rgba(245,190,70,0.24)]"
        title={t.appName}
      >
        <img
          src={logoUrl}
          alt={dir === "rtl" ? "شعار وزارة النقل المصرية" : "Egyptian Ministry of Transport logo"}
          width={55}
          height={36}
          className="h-9 w-auto max-w-none shrink-0"
        />
      </div>
      <nav className="mt-3 flex min-h-0 w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden">
        {items.map((it) => {
          const active = location.pathname === it.to;
          return (
            <Link
              key={it.to}
              to={it.to}
              preload="viewport"
              title={it.label}
              aria-label={it.label}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-lg border border-transparent transition-colors ${
                active
                  ? "text-[var(--brand)]"
                  : "text-muted-foreground hover:border-[var(--brand)]/35 hover:bg-[var(--surface-hover)] hover:text-foreground"
              }`}
            >
              {active && (
                <span
                  className="absolute inset-0 rounded-lg border border-[var(--brand)]/45 bg-[var(--surface-active)] shadow-[0_0_18px_color-mix(in_oklch,var(--brand)_24%,transparent)]"
                />
              )}
              <it.icon className="relative h-[18px] w-[18px]" />
              {/* tooltip on hover */}
              <span
                className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${
                  dir === "rtl" ? "right-12" : "left-12"
                }`}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div
        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-white/95 p-1 shadow-sm"
        title="Ismailia GeoDash"
      >
        <img
          src={companyLogoUrl}
          alt="Ismailia GeoDash"
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
        />
      </div>
    </aside>
  );
}
