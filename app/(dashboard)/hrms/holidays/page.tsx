"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Flag, MoreHorizontal, Sun, Info, Loader2, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

interface Holiday {
  id: string;
  holiday_name: string;
  holiday_date: string;
  day: string;
  holiday_type: string;
  payroll_impact: string;
}

export default function HolidayCalendarPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("holidays")
        .select("*")
        .order("holiday_date");

      if (fetchError) throw fetchError;

      const formattedHolidays: Holiday[] = (data || []).map((h: any) => {
        let dayName = "Unknown";
        try {
          if (h.holiday_date) {
            dayName = format(new Date(h.holiday_date), "EEEE");
          }
        } catch (e) {
            // handle invalid dates
        }

        return {
          id: h.id,
          holiday_name: h.holiday_name,
          holiday_date: h.holiday_date,
          day: dayName,
          holiday_type: h.holiday_type || "Company Off",
          payroll_impact: h.payroll_impact || "Standard Off",
        };
      });

      setHolidays(formattedHolidays);
    } catch (err: any) {
      console.error("Error fetching holidays:", err);
      setError("Failed to load holiday calendar");
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<Holiday>[] = [
    {
      accessorKey: "holiday_name",
      header: "Holiday Instance",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
            <Flag className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.holiday_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.id.substring(0, 10)}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "holiday_date",
      header: "Observed Date",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
            <span className="text-sm font-bold">{row.original.holiday_date}</span>
            <span className="text-[10px] text-muted-foreground font-medium">{row.original.day}</span>
        </div>
      ),
    },
    {
      accessorKey: "holiday_type",
      header: "Classification",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn(
            "text-[10px] uppercase font-bold px-2 py-0.5",
            row.original.holiday_type === "National" ? "bg-primary/5 text-primary border-primary/20" : "bg-muted/50 text-muted-foreground border-none"
        )}>
            {row.getValue("holiday_type")}
        </Badge>
      ),
    },
    {
      accessorKey: "payroll_impact",
      header: "Payroll Logic",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-info" />
            <span className="text-xs font-bold text-muted-foreground">{row.getValue("payroll_impact")}</span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: () => (
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  // Derive stats
  const nationalCount = holidays.filter(h => h.holiday_type === "National").length;
  const regionalCount = holidays.filter(h => h.holiday_type === "Regional").length;
  const companyCount = holidays.filter(h => h.holiday_type === "Company Off").length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Holiday Master"
        description="Unified calendar of National and Regional holidays utilized for payroll and statutory pay calculations."
        actions={
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Add Holiday
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { label: "Public Holidays", value: nationalCount, sub: "National observance", icon: Flag, color: "text-primary" },
            { label: "Regional / Fest", value: regionalCount, sub: "State-specific", icon: Sun, color: "text-warning" },
            { label: "Company Special", value: companyCount, sub: "Organization specific", icon: Calendar, color: "text-info" },
          ].map((stat, i) => (
              <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
                  <div className="flex items-center gap-4">
                      <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                          <stat.icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col text-left">
                          <span className="text-2xl font-bold ">{stat.value}</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                      </div>
                  </div>
              </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
           <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={holidays} searchKey="holiday_name" />
      )}
    </div>
  );
}
