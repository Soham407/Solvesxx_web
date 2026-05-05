import type { ServiceDashboardStats } from "@/src/types/operations";

export interface ServiceRequestStatsRow {
  status: string | null;
  priority: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  scheduled_date?: string | null;
}

export interface ServiceRequestDetailRow {
  service_name?: string | null;
  service_code?: string | null;
  status?: string | null;
  after_photo_url?: string | null;
  completion_notes?: string | null;
}

export function buildServiceDashboardStats(
  requests: ServiceRequestStatsRow[],
): ServiceDashboardStats {
  const today = new Date().toISOString().split("T")[0];
  const completedToday = requests.filter(
    (request) =>
      (request.status === "completed" || request.status === "closed") &&
      request.completed_at?.startsWith(today),
  ).length;

  const completedWithTimes = requests.filter(
    (request) =>
      (request.status === "completed" || request.status === "closed") &&
      request.created_at &&
      request.completed_at,
  );
  const avgResolutionTime =
    completedWithTimes.length > 0
      ? completedWithTimes.reduce((acc, request) => {
          const created = new Date(request.created_at!).getTime();
          const completed = new Date(request.completed_at!).getTime();
          return acc + (completed - created) / (1000 * 60 * 60);
        }, 0) / completedWithTimes.length
      : 0;
  const overdueRequests = requests.filter((request) => {
    if (!request.scheduled_date) return false;

    if (["completed", "cancelled", "closed"].includes(request.status || "")) {
      return false;
    }

    return request.scheduled_date < today;
  }).length;

  return {
    openRequests: requests.filter((request) => request.status === "open" || request.status === "assigned").length,
    inProgressRequests: requests.filter((request) => request.status === "in_progress").length,
    completedToday,
    overdueRequests,
    avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
    urgentRequests: requests.filter(
      (request) => request.priority === "urgent" && request.status !== "completed",
    ).length,
  };
}

export function isPestControlServiceRequest(
  serviceRequest: Pick<ServiceRequestDetailRow, "service_name" | "service_code"> | null | undefined,
): boolean {
  const serviceName = String(serviceRequest?.service_name || "").toLowerCase();
  const serviceCode = String(serviceRequest?.service_code || "");

  return (
    serviceCode === "PST-CON" ||
    serviceName.includes("pest control") ||
    serviceName.includes("pest") ||
    serviceName.includes("pst-con")
  );
}
