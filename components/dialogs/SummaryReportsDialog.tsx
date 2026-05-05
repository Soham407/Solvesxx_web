"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, BarChart3, FileText, Lock } from "lucide-react";

interface SummaryReportsDialogProps {
  children: React.ReactNode;
  reportType?: "tickets" | "attendance" | "services" | "finance";
}

export function SummaryReportsDialog({ children, reportType = "tickets" }: SummaryReportsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const reportConfigs = {
    tickets: {
      title: "Ticket Summary Report",
      description: "Generate comprehensive ticket analytics and metrics.",
      metrics: ["Total Tickets", "Resolution Time", "Open vs Closed", "Category Breakdown"],
    },
    attendance: {
      title: "Attendance Summary Report",
      description: "Staff attendance patterns and compliance metrics.",
      metrics: ["Present Count", "Late Arrivals", "Absences", "Overtime Hours"],
    },
    services: {
      title: "Service Performance Report",
      description: "Service delivery metrics and technician performance.",
      metrics: ["Jobs Completed", "Average Response Time", "Customer Satisfaction", "Revenue"],
    },
    finance: {
      title: "Financial Summary Report",
      description: "Revenue, expenses, and financial performance metrics.",
      metrics: ["Total Revenue", "Outstanding Payments", "Monthly Growth", "Top Expenses"],
    },
  };

  const config = reportConfigs[reportType];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Report Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {config.metrics.map((metric, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm">{metric}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm">
            <p className="flex items-center gap-2 font-medium text-warning">
              <AlertCircle className="h-4 w-4" />
              Export currently unavailable
            </p>
            <p className="mt-1 text-muted-foreground">
              This module does not expose downloadable summary reports in production until a real report dataset is wired.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" disabled>
              <Lock className="mr-2 h-4 w-4" />
              Export disabled in production
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
