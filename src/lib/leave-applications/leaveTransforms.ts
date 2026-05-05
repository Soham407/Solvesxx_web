export interface LeaveType {
  id: string;
  leave_type: string;
  leave_name: string;
  yearly_quota: number;
  can_carry_forward: boolean;
  max_carry_forward: number;
  requires_approval: boolean;
  description: string | null;
  is_active: boolean;
}

export interface LeaveApplication {
  id: string;
  employee_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  number_of_days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    employee_code: string;
    photo_url?: string | null;
  };
  leave_type?: LeaveType;
  approver?: {
    first_name: string;
    last_name: string;
  };
}

export interface CreateLeaveApplicationDTO {
  leave_type_id: string;
  from_date: string;
  to_date: string;
  reason: string;
}

export interface LeaveBalance {
  leave_type: string;
  leave_name: string;
  yearly_quota: number;
  used: number;
  pending: number;
  available: number;
}

export interface LeaveStats {
  pendingRequests: number;
  onLeaveToday: number;
  approvedMonth: number;
  rejectedMonth: number;
}

export type LeaveApplicationRow = LeaveApplication & {
  leave_type?: LeaveType | null;
};

export function buildLeaveStats(apps: LeaveApplication[], today: string, currentMonth: number): LeaveStats {
  return {
    pendingRequests: apps.filter((l) => l.status === "pending").length,
    onLeaveToday: apps.filter((l) => l.status === "approved" && l.from_date <= today && l.to_date >= today).length,
    approvedMonth: apps.filter((l) => l.status === "approved" && new Date(l.created_at).getMonth() === currentMonth).length,
    rejectedMonth: apps.filter((l) => l.status === "rejected" && new Date(l.created_at).getMonth() === currentMonth).length,
  };
}

export function buildLeaveBalances(types: LeaveType[], apps: LeaveApplication[], employeeId?: string) {
  const balanceMap: Record<string, LeaveBalance> = {};
  types.forEach((lt) => {
    balanceMap[lt.id] = {
      leave_type: lt.leave_type,
      leave_name: lt.leave_name,
      yearly_quota: lt.yearly_quota,
      used: 0,
      pending: 0,
      available: lt.yearly_quota,
    };
  });

  if (employeeId) {
    const currentYear = new Date().getFullYear();
    apps.forEach((app) => {
      const appYear = new Date(app.from_date).getFullYear();
      if (appYear === currentYear && balanceMap[app.leave_type_id]) {
        if (app.status === "approved") {
          balanceMap[app.leave_type_id].used += app.number_of_days;
        } else if (app.status === "pending") {
          balanceMap[app.leave_type_id].pending += app.number_of_days;
        }
      }
    });

    Object.values(balanceMap).forEach((balance) => {
      balance.available = balance.yearly_quota - balance.used - balance.pending;
    });
  }

  return Object.values(balanceMap);
}
