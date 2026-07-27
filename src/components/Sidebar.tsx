import { Link, useRouterState } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import logoUrl from "@/assets/company-logo.avif";
import {
  LayoutDashboard,
  Building2,
  Sprout,
  Factory,
  GitCompare,
  MapPinned,
  PanelsTopLeft,
  Banknote,
} from "lucide-react";
import { motion } from "framer-motion";

export function Sidebar() {
  const { t, dir } = useI18n();
  const { location } = useRouterState();
  const items = [
    { to: "/", icon: LayoutDashboard, label: t.nav.overview },
    { to: "/urban", icon: Building2, label: t.nav.urban },
    { to: "/agricultural", icon: Sprout, label: t.nav.agricultural },
    { to: "/industrial", icon: Factory, label: t.nav.industrial },
    { to: "/prices", icon: Banknote, label: t.nav.prices },
    { to: "/comparison", icon: GitCompare, label: t.nav.comparison },
    { to: "/story", icon: PanelsTopLeft, label: t.nav.story },
    { to: "/change-samples", icon: MapPinned, label: t.nav.changeSamples },
  ];
  return (
    <aside className="glass surface-hover hidden h-full min-h-0 w-14 shrink-0 flex-col items-center rounded-xl p-2 md:flex">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border"
        title={t.appName}
      >
        <img
          src={logoUrl}
          alt="Ismailia Geo Dashboard Logo"
          width={28}
          height={28}
          className="h-7 w-7"
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
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg border border-[var(--brand)]/45 bg-[var(--surface-active)] shadow-[0_0_18px_color-mix(in_oklch,var(--brand)_24%,transparent)]"
                  transition={{ type: "spring", stiffness: 280, damping: 28 }}
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
      <div className="mt-1 shrink-0 text-[9px] text-muted-foreground" title="Ismailia GeoDash">
        ©{new Date().getFullYear()}
      </div>
    </aside>
  );
}
