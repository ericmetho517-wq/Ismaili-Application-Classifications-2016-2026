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
    <section
      className={`glass ${
        colorful ? "colorful-card" : ""
      } surface-hover relative flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-2xl p-3 shadow-xl transition-all ${
        fitContent ? "shrink-0" : ""
      } ${className}`}
    >
      {/* Top subtle gradient highlight line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--brand)]/45 to-transparent" />

      {(title || right) && (
        <header className="section-divider relative z-10 mb-3 grid min-h-10 shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] items-center gap-2 border-b border-border/70 pb-2.5">
          {title && (
            <h3 className="col-start-2 min-w-0 text-center text-lg font-black leading-snug text-foreground sm:text-xl">
              {title}
            </h3>
          )}
          {right && <div className="col-start-3 row-start-1 flex min-w-0 justify-self-end">{right}</div>}
        </header>
      )}
      <div className={`relative z-10 min-h-0 min-w-0 max-w-full ${fitContent ? "flex-none" : "flex-auto"}`}>
        {children}
      </div>
    </section>
  );
}
