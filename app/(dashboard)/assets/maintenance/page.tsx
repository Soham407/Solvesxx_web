"use client";

import { useCallback } from "react";
import { MaintenanceScheduleList } from "@/components/maintenance/MaintenanceScheduleList";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import type { DueMaintenanceSchedule } from "@/src/types/operations";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function MaintenanceSchedulesPage() {
  const { createRequest, assignRequest } = useServiceRequests();

  const handleCreateServiceRequest = useCallback(
    async (schedule: DueMaintenanceSchedule) => {
      const result = await createRequest({
        title: schedule.task_name || "Scheduled Maintenance",
        description:
          schedule.task_description ||
          `Scheduled maintenance for ${schedule.asset_name || "the linked asset"}`,
        asset_id: schedule.asset_id,
        location_id: schedule.location_id || null,
        maintenance_schedule_id: schedule.id,
        scheduled_date: schedule.next_due_date || null,
        priority: "normal",
      });

      if (!result.success || !result.data?.id) {
        toast.error(result.error || "Failed to create service request");
        return;
      }

      if (schedule.assigned_to_employee) {
        const assignResult = await assignRequest(result.data.id, schedule.assigned_to_employee);

        if (!assignResult.success) {
          toast.error(assignResult.error || "Service request was created but assignment failed");
          return;
        }
      }

      toast.success("Maintenance schedule converted into a service request");
    },
    [assignRequest, createRequest]
  );

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
      <MaintenanceScheduleList onCreateServiceRequest={handleCreateServiceRequest} />
    </div>
  );
}
