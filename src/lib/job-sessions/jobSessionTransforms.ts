import type { JobSessionWithPhotos } from "@/src/types/operations";
import { isPestControlServiceRequest, type ServiceRequestDetailRow } from "@/src/lib/service-requests/serviceRequestTransforms";

export interface JobSessionRow {
  job_photos?: Array<Record<string, unknown>> | null;
  service_request?: Record<string, unknown> | null;
  status?: string | null;
}

export function isPestControlJobRequest(
  serviceRequest: Pick<ServiceRequestDetailRow, "service_name" | "service_code"> | null | undefined,
): boolean {
  return isPestControlServiceRequest(serviceRequest);
}

export function mapJobSessionWithPhotos(session: JobSessionRow): JobSessionWithPhotos {
  return {
    ...(session as JobSessionWithPhotos),
    photos: (session.job_photos || []) as JobSessionWithPhotos["photos"],
    service_request: session.service_request
      ? ({
          ...(session.service_request as JobSessionWithPhotos["service_request"]),
          location: (session.service_request as JobSessionWithPhotos["service_request"])?.location || undefined,
        } as JobSessionWithPhotos["service_request"])
      : undefined,
  };
}

export function mapJobSessionsWithPhotos(rows: JobSessionRow[] | null | undefined): JobSessionWithPhotos[] {
  return (rows || []).map((session) => mapJobSessionWithPhotos(session));
}

export function getActiveJobSession(
  sessions: JobSessionWithPhotos[],
): JobSessionWithPhotos | null {
  return sessions.find((session) => session.status === "started" || session.status === "paused") || null;
}
