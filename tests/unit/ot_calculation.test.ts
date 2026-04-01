import { describe, it, expect } from 'vitest';

// Mocking the logic found in calculate_employee_salary and hooks/useAttendance.ts
function calculateOvertime(workedHours: number, standardHours: number = 8): number {
  return Math.max(0, workedHours - standardHours);
}

describe('Overtime Calculation', () => {
  it('should calculate OT based on hardcoded 8 hours when no standard hours provided', () => {
    expect(calculateOvertime(10)).toBe(2);
    expect(calculateOvertime(7)).toBe(0);
  });

  it('should calculate OT based on provided standard hours', () => {
    expect(calculateOvertime(10, 6)).toBe(4);
    expect(calculateOvertime(10, 12)).toBe(0);
  });

  it('should handle night shifts spanning midnight', () => {
    // This is more about how workedHours is calculated
    const startTime = "22:00:00";
    const endTime = "06:00:00";
    
    const start = new Date(`2026-04-01T${startTime}`);
    let end = new Date(`2026-04-01T${endTime}`);
    
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const workedHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    expect(workedHours).toBe(8);
  });
});
