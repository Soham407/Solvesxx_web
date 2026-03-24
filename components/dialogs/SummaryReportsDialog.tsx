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
import { FileText, Download, Loader2, BarChart3, Calendar, Filter } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SummaryReportsDialogProps {
  children: React.ReactNode;
  reportType?: "tickets" | "attendance" | "services" | "finance";
}

export function SummaryReportsDialog({ children, reportType = "tickets" }: SummaryReportsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRange] = useState("last30days");
  const [format_type, setFormat_type] = useState("pdf");
  const { toast } = useToast();

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

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      
      // Simulate report generation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      toast({
        title: "Report Generated",
        description: `${config.title} has been generated and is ready for download.`,
      });
      
      setIsGenerating(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    // Create a sample CSV content
    const csvContent = `Report: ${config.title}\nGenerated: ${format(new Date(), "PPP")}\n\nMetric,Value\n${config.metrics.map(m => `${m},Sample Value`).join("\n")}`;
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Report Downloaded",
      description: "Your report has been downloaded successfully.",
    });
  };

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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="thisQuarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Format
              </label>
              <Select value={format_type} onValueChange={setFormat_type}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                  <SelectItem value="csv">CSV File</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
            <Button variant="outline" disabled>
              <Download className="mr-2 h-4 w-4" />
              Reports Coming Soon
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
