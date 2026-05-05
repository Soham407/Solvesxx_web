export interface LeaveType {
  id: string;
  leave_name: string;
  leave_type: string;
  yearly_quota: number;
  is_paid: boolean;
  can_carry_forward: boolean;
  max_carry_forward: number | null;
  requires_approval: boolean;
  is_active: boolean;
  created_at: string;
}

export type LeaveTypeRow = {
  id: string;
  leave_name: string;
  leave_type: string;
  yearly_quota: number;
  can_carry_forward: boolean | null;
  max_carry_forward: number | null;
  requires_approval: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
};

export interface CreateLeaveTypeInput {
  leave_name: string;
  yearly_quota: number;
  is_paid: boolean;
  can_carry_forward: boolean;
  max_carry_forward?: number | null;
}

export const toDbLeaveType = (isPaid: boolean) => (isPaid ? "paid_leave" : "unpaid_leave");

export function mapLeaveTypeRow(row: LeaveTypeRow): LeaveType {
  return {
    id: row.id,
    leave_name: row.leave_name,
    leave_type: row.leave_type,
    yearly_quota: row.yearly_quota,
    is_paid: row.leave_type === "paid_leave",
    can_carry_forward: row.can_carry_forward ?? false,
    max_carry_forward: row.max_carry_forward ?? null,
    requires_approval: row.requires_approval ?? false,
    is_active: row.is_active ?? true,
    created_at: row.created_at || new Date().toISOString(),
  };
}
