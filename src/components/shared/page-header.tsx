import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  accentColor?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accentColor,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-[18px] w-[18px] text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && (
            <p className="text-[13px] text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
