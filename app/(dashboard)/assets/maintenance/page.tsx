"use client";

import { MaintenanceScheduleList } from "@/components/maintenance/MaintenanceScheduleList";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function MaintenanceSchedulesPage() {
  return (
    <div className="flex-1 space-y-6 p-8">
      <PageHeader
        title="Maintenance Schedules"
        description="View and manage preventive maintenance schedules"
      >
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Schedule
        </Button>
      </PageHeader>
      <MaintenanceScheduleList />
    </div>
  );
}
