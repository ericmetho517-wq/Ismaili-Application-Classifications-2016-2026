import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Languages } from "lucide-react";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="glass surface-hover flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold text-foreground hover:text-[var(--brand)]"
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      <span>{lang === "ar" ? "EN" : "ع"}</span>
    </motion.button>
  );
}
