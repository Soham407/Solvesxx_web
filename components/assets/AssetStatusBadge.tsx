"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_COLORS,
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_COLORS,
  SERVICE_PRIORITY_LABELS,
  SERVICE_PRIORITY_COLORS,
  JOB_SESSION_STATUS_LABELS,
  JOB_SESSION_STATUS_COLORS,
} from "@/src/lib/constants";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

// Asset Status Badge
export function AssetStatusBadge({ status, className }: StatusBadgeProps) {
  const label = ASSET_STATUS_LABELS[status] || status;
  const color = ASSET_STATUS_COLORS[status] || "#6b7280";

  return (
    <Badge
      className={cn("font-bold text-[10px] uppercase border", className)}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        borderColor: `${color}30`,
      }}
    >
      {label}
    </Badge>
  );
}

// Service Request Status Badge
export function RequestStatusBadge({ status, className }: StatusBadgeProps) {
  const label = SERVICE_REQUEST_STATUS_LABELS[status] || status;
  const color = SERVICE_REQUEST_STATUS_COLORS[status] || "#6b7280";

  return (
    <Badge
      className={cn("font-bold text-[10px] uppercase border", className)}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        borderColor: `${color}30`,
      }}
    >
      {label}
    </Badge>
  );
}

// Priority Badge
export function PriorityBadge({ status, className }: StatusBadgeProps) {
  const label = SERVICE_PRIORITY_LABELS[status] || status;
  const color = SERVICE_PRIORITY_COLORS[status] || "#6b7280";

  return (
    <Badge
      className={cn("font-bold text-[10px] uppercase border", className)}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        borderColor: `${color}30`,
      }}
    >
      {label}
    </Badge>
  );
}

// Job Session Status Badge
export function JobSessionStatusBadge({ status, className }: StatusBadgeProps) {
  const label = JOB_SESSION_STATUS_LABELS[status] || status;
  const color = JOB_SESSION_STATUS_COLORS[status] || "#6b7280";

  return (
    <Badge
      className={cn("font-bold text-[10px] uppercase border", className)}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        borderColor: `${color}30`,
      }}
    >
      {label}
    </Badge>
  );
}
