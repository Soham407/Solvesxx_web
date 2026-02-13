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
        return "bg-indigo-50 text-indigo-700 border-indigo-200/50 shadow-sm shadow-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-700/30 dark:shadow-indigo-900/20";
      case "manager":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/50 shadow-sm shadow-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/30 dark:shadow-emerald-900/20";
      case "buyer":
        return "bg-blue-50 text-blue-700 border-blue-200/50 shadow-sm shadow-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30 dark:shadow-blue-900/20";
      case "supplier":
        return "bg-amber-50 text-amber-700 border-amber-200/50 shadow-sm shadow-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/30 dark:shadow-amber-900/20";
      case "guard":
      case "security":
        return "bg-slate-50 text-slate-700 border-slate-200/50 shadow-sm shadow-slate-100 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-600/30 dark:shadow-slate-900/20";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200/50 shadow-sm dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600/30";
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
