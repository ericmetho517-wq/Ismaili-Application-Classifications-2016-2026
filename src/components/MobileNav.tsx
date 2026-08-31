import { Link, useRouterState } from "@tanstack/react-router";
import { Banknote, Building2, Factory, Sprout } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function MobileNav() {
  const { t } = useI18n();
  const { location } = useRouterState();
  const items = [
    { to: "/prices", icon: Banknote, label: t.nav.prices },
    { to: "/urban", icon: Building2, label: t.nav.urban },
    { to: "/agricultural", icon: Sprout, label: t.nav.agricultural },
    { to: "/industrial", icon: Factory, label: t.nav.industrial },
  ];

  return (
    <nav className="glass !fixed inset-x-1 bottom-1 z-[1200] flex h-14 items-stretch gap-1 overflow-x-auto rounded-xl px-1.5 py-1 md:hidden">
      {items.map((item) => {
        const active = location.pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            preload="viewport"
            aria-label={item.label}
            className={`flex min-w-[58px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[8px] font-semibold transition-colors ${
              active
                ? "bg-[var(--surface-active)] text-[var(--brand)] ring-1 ring-[var(--brand)]/45"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="max-w-[54px] truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
