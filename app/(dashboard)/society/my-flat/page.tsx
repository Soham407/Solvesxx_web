import React from "react";
import { ResidentDashboard } from "@/components/dashboards/ResidentDashboard";

export default function MyFlatPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resident Portal</h1>
          <p className="text-muted-foreground">Manage your flat, visitors, and society interactions.</p>
        </div>
      </div>
      <React.Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin text-primary border-4 border-primary/20 border-t-primary rounded-full" />
            <p className="text-sm text-muted-foreground font-medium">Loading Dashboard...</p>
          </div>
        </div>
      }>
        <ResidentDashboard />
      </React.Suspense>
    </div>
  );
}

