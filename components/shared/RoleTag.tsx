import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface RoleTagProps {
  role: string;
  className?: string;
}

export function RoleTag({ role, className }: RoleTagProps) {
  const getRoleColor = (r: string) => {
    switch (r.toLowerCase()) {
      case "admin":
      case "super admin":
        return "bg-primary/10 text-primary border-primary/15 shadow-sm shadow-primary/5";
      case "manager":
        return "bg-success/10 text-success border-success/15 shadow-sm shadow-success/10";
      case "buyer":
        return "bg-info/10 text-info border-info/15 shadow-sm shadow-info/10";
      case "supplier":
        return "bg-warning/15 text-warning border-warning/20 shadow-sm shadow-warning/10";
      case "guard":
      case "security":
        return "bg-secondary text-primary border-border shadow-sm";
      default:
        return "bg-muted text-foreground border-border shadow-sm";
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all duration-200 hover:scale-105",
        getRoleColor(role), 
        className
      )}
    >
      {role}
    </Badge>
  );
}
