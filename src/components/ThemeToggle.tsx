import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { lang } = useI18n();
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label =
    theme === "dark"
      ? lang === "ar"
        ? "أبيض"
        : "Light"
      : lang === "ar"
        ? "داكن"
        : "Dark";

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(nextTheme)}
      className="glass surface-hover flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold text-foreground hover:text-[var(--brand)]"
      aria-label={lang === "ar" ? "تبديل الثيم" : "Toggle theme"}
      title={lang === "ar" ? "تبديل الثيم" : "Toggle theme"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span>{label}</span>
    </motion.button>
  );
}
