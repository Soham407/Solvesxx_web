import { describe, it, expect } from 'vitest';

// Real logic to test
function calculateWorkedHours(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function calculateOvertime(workedHours: number, standardHours: number = 8): number {
  return Math.max(0, parseFloat((workedHours - standardHours).toFixed(2)));
}

describe('Overtime Calculation Integration', () => {
  it('calculates 2 hours OT for 10 hours worked on 8 hour shift', () => {
    const checkIn = "2026-04-01T09:00:00Z";
    const checkOut = "2026-04-01T19:00:00Z";
    const worked = calculateWorkedHours(checkIn, checkOut);
    expect(worked).toBe(10);
    expect(calculateOvertime(worked, 8)).toBe(2);
  });

  it('calculates 0 hours OT for 8 hours worked on 8 hour shift', () => {
    const checkIn = "2026-04-01T09:00:00Z";
    const checkOut = "2026-04-01T17:00:00Z";
    const worked = calculateWorkedHours(checkIn, checkOut);
    expect(worked).toBe(8);
    expect(calculateOvertime(worked, 8)).toBe(0);
  });

  it('calculates 1.5 hours OT for 10 hours worked on 8.5 hour shift', () => {
    const checkIn = "2026-04-01T08:00:00Z";
    const checkOut = "2026-04-01T18:00:00Z";
    const worked = calculateWorkedHours(checkIn, checkOut);
    expect(worked).toBe(10);
    expect(calculateOvertime(worked, 8.5)).toBe(1.5);
  });

  it('handles night shifts spanning midnight correctly', () => {
    const checkIn = "2026-04-01T22:00:00Z";
    const checkOut = "2026-04-02T06:00:00Z";
    const worked = calculateWorkedHours(checkIn, checkOut);
    expect(worked).toBe(8);
    expect(calculateOvertime(worked, 8)).toBe(0);
  });

  it('handles longer night shifts with OT', () => {
    const checkIn = "2026-04-01T20:00:00Z";
    const checkOut = "2026-04-02T06:00:00Z";
    const worked = calculateWorkedHours(checkIn, checkOut);
    expect(worked).toBe(10);
    expect(calculateOvertime(worked, 8)).toBe(2);
  });
});
