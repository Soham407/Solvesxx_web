import { describe, it, expect } from 'vitest';

// Logic from calculate_employee_salary (SQL-like)
function calculateStandardHours(shift: { start_time: string, end_time: string, standard_hours?: number, duration_hours?: number }): number {
  let standardHours = shift.standard_hours ?? shift.duration_hours;
  
  if (standardHours === undefined && shift.start_time && shift.end_time) {
    const [startH, startM] = shift.start_time.split(':').map(Number);
    const [endH, endM] = shift.end_time.split(':').map(Number);
    
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    
    if (endMinutes < startMinutes) {
      // Night shift spanning midnight
      endMinutes += 24 * 60;
    }
    
    standardHours = (endMinutes - startMinutes) / 60;
  }
  
  return standardHours ?? 8;
}

function calculateOvertime(totalHours: number, standardHours: number): number {
  return Math.max(0, totalHours - standardHours);
}

describe('Overtime Calculation Logic', () => {
  it('calculates standard hours for day shift', () => {
    const shift = { start_time: "09:00:00", end_time: "18:00:00" };
    expect(calculateStandardHours(shift)).toBe(9);
  });

  it('calculates standard hours for night shift spanning midnight', () => {
    const shift = { start_time: "22:00:00", end_time: "06:00:00" };
    expect(calculateStandardHours(shift)).toBe(8);
  });

  it('uses standard_hours if provided', () => {
    const shift = { start_time: "09:00:00", end_time: "18:00:00", standard_hours: 8 };
    expect(calculateStandardHours(shift)).toBe(8);
  });

  it('uses duration_hours if standard_hours is missing', () => {
    const shift = { start_time: "09:00:00", end_time: "18:00:00", duration_hours: 8.5 };
    expect(calculateStandardHours(shift)).toBe(8.5);
  });

  it('falls back to 8 if everything is missing', () => {
    const shift = { start_time: "", end_time: "" };
    // @ts-ignore
    expect(calculateStandardHours(shift)).toBe(8);
  });

  it('calculates overtime correctly', () => {
    expect(calculateOvertime(10, 8)).toBe(2);
    expect(calculateOvertime(7, 8)).toBe(0);
    expect(calculateOvertime(8.5, 8)).toBe(0.5);
  });
});
