export type CompanyEvent = {
  id: string;
  event_code: string;
  title: string;
  category: string;
  event_date: string;
  event_time: string;
  venue: string;
  attendees: string | null;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  description: string | null;
  location_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CompanyEventRow = {
  id: string;
  event_code: string | null;
  title: string | null;
  category: string | null;
  event_date: string;
  event_time: string | null;
  venue: string | null;
  attendees: string | null;
  status: string | null;
  description: string | null;
  location_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  event_name: string | null;
  created_by: string | null;
};

export function mapCompanyEventRow(event: CompanyEventRow): CompanyEvent {
  return {
    id: event.id,
    event_code: event.event_code || "",
    title: event.title || event.event_name || "Untitled Event",
    category: event.category || "General",
    event_date: event.event_date,
    event_time: event.event_time || "",
    venue: event.venue || "",
    attendees: event.attendees,
    status: (event.status as CompanyEvent["status"]) || "Scheduled",
    description: event.description,
    location_id: event.location_id,
    is_active: event.is_active ?? true,
    created_at: event.created_at || new Date().toISOString(),
    updated_at: event.updated_at || new Date().toISOString(),
  };
}

export function sortCompanyEventsByDate(events: CompanyEvent[]) {
  return [...events].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
  );
}
