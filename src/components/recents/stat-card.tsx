export function StatCard({
  icon,
  count,
  label,
  active,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-3 transition-colors sm:px-4 ${
        active
          ? "border-border/60 bg-card/70 dark:border-white/[0.1] dark:bg-white/[0.04]"
          : "border-border/40 bg-card/30 dark:border-white/[0.06] dark:bg-white/[0.02]"
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10.5px] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
        {count}
      </p>
    </div>
  );
}
