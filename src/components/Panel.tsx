import { motion } from "framer-motion";

export function Panel({
  title,
  right,
  children,
  className = "",
  colorful = true,
  fitContent = false,
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  colorful?: boolean;
  fitContent?: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`glass ${colorful ? "colorful-card" : ""} surface-hover flex min-h-0 min-w-0 max-w-full flex-col rounded-xl p-2.5 ${fitContent ? "shrink-0" : ""} ${className}`}
    >
      {(title || right) && (
        <header className="section-divider relative z-10 mb-2 flex shrink-0 items-center justify-between gap-2 border-b pb-2">
          {title && <h3 className="text-sm font-extrabold leading-snug text-foreground sm:text-base">{title}</h3>}
          {right}
        </header>
      )}
      <div className={`relative z-10 min-h-0 min-w-0 max-w-full ${fitContent ? "flex-none" : "flex-auto"}`}>{children}</div>
    </motion.section>
  );
}
