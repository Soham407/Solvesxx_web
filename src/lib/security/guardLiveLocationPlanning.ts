"use client";

export interface GuardLocation {
  employee_id: string;
  guard_name: string;
  latitude: number;
  longitude: number;
  tracked_at: string;
  status: "active" | "inactive";
}

interface GuardLiveLogRow {
  employee_id: string;
  employee?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface GuardGpsRow {
  employee_id: string;
  latitude: number | string;
  longitude: number | string;
  tracked_at: string;
}

export function buildGuardLiveLocations(
  activeLogs: GuardLiveLogRow[],
  guardIds: string[],
  gpsData: GuardGpsRow[],
): GuardLocation[] {
  const latestByEmployee = new Map<string, GuardLocation>();

  activeLogs.forEach((log) => {
    if (!guardIds.includes(log.employee_id)) {
      return;
    }

    const emp = log.employee;
    const fullName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : "Unknown Guard";
    const latestGps = gpsData.find((g) => g.employee_id === log.employee_id);

    if (!latestGps) {
      return;
    }

    latestByEmployee.set(log.employee_id, {
      employee_id: log.employee_id,
      guard_name: fullName,
      latitude: Number(latestGps.latitude),
      longitude: Number(latestGps.longitude),
      tracked_at: latestGps.tracked_at,
      status: "active",
    });
  });

  return Array.from(latestByEmployee.values());
}
