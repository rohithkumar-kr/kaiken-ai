import { cn } from "@/lib/utils";

export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="bg-foreground text-background grid size-8 shrink-0 place-items-center rounded-lg">
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
          <path d="M12 2.25c.55 4.6 2.65 8.6 9.75 9.75-7.1 1.15-9.2 5.15-9.75 9.75-.55-4.6-2.65-8.6-9.75-9.75C9.35 10.85 11.45 6.85 12 2.25Z" />
        </svg>
      </span>
      {withWordmark ? (
        <span className="text-[0.95rem] font-semibold tracking-tight">Kaiken AI</span>
      ) : null}
    </span>
  );
}
