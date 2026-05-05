export interface Holiday {
  id: string;
  holiday_name: string;
  holiday_date: string;
  holiday_type: string | null;
  payroll_impact: string | null;
  description: string | null;
  is_active: boolean | null;
  year: number;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export interface CreateHolidayDTO {
  holiday_name: string;
  holiday_date: string;
  holiday_type?: string;
  payroll_impact?: string;
  description?: string;
  year: number;
}

export type HolidayRow = Holiday;

export function mapHolidayRow(holiday: HolidayRow): Holiday {
  return holiday;
}

export function sortHolidaysByDate(holidays: Holiday[]) {
  return [...holidays].sort(
    (a, b) => new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime(),
  );
}

export function isHolidayInRange(holidayDate: string, start: Date, end: Date) {
  const parsed = new Date(holidayDate);
  return parsed >= start && parsed <= end;
}

export function getHolidayDateString(date: Date | string) {
  return typeof date === "string" ? date : date.toISOString().split("T")[0];
}
