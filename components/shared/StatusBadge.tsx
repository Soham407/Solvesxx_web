import { cn } from "@/lib/utils";

export type StatusType = "success" | "pending" | "error" | "info" | "warning";

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  className?: string;
  pulse?: boolean;
}

export function StatusBadge({ status, label, className, pulse = false }: StatusBadgeProps) {
  const getStatusStyles = (s: string) => {
    switch (s.toLowerCase()) {
      case "success":
      case "approved":
      case "paid":
      case "active":
        return "bg-success/10 text-success border-success/30 shadow-sm shadow-success/10";
      case "pending":
      case "in progress":
      case "draft":
        return "bg-warning/10 text-warning border-warning/30 shadow-sm shadow-warning/10";
      case "error":
      case "rejected":
      case "failed":
      case "critical":
        return "bg-critical/10 text-critical border-critical/30 shadow-sm shadow-critical/10";
      case "info":
      case "new":
        return "bg-info/10 text-info border-info/30 shadow-sm shadow-info/10";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-200",
        getStatusStyles(status),
        className
      )}
    >
      <span 
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current mr-2",
          pulse && "animate-pulse"
        )} 
      />
      {label || status}
    </span>
  );
}
