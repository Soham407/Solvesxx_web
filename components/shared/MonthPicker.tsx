"use client";

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format, subMonths, startOfMonth } from "date-fns";

interface MonthPickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function MonthPicker({ selectedDate, onDateChange }: MonthPickerProps) {
  // Generate last 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    return startOfMonth(subMonths(new Date(), i));
  });

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Reporting Period:</span>
      <Select 
        value={format(selectedDate, "yyyy-MM")} 
        onValueChange={(val) => {
          const [year, month] = val.split("-");
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          onDateChange(date);
        }}
      >
        <SelectTrigger className="w-[180px] h-9 text-sm font-medium">
          <SelectValue placeholder="Select month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={format(month, "yyyy-MM")} value={format(month, "yyyy-MM")}>
              {format(month, "MMMM yyyy")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
