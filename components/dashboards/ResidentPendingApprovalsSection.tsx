"use client";

import { Car, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VisitorAvatar } from "@/components/society/VisitorAvatar";
import type { ResidentPendingVisitor } from "@/hooks/useResident";

interface ResidentPendingApprovalsSectionProps {
  pendingApprovals: ResidentPendingVisitor[];
  isProcessingApproval: string | null;
  onApprove: (visitorId: string) => void;
  onDeny: (visitorId: string) => void;
}

function formatDate(isoString: string | null) {
  if (!isoString) return "Pending";
  const date = new Date(isoString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function ResidentPendingApprovalsSection({
  pendingApprovals,
  isProcessingApproval,
  onApprove,
  onDeny,
}: ResidentPendingApprovalsSectionProps) {
  if (pendingApprovals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2 px-1">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-critical opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-critical" />
        </span>
        <h2 className="text-sm font-black uppercase tracking-widest text-critical">
          Action Required: Visitor at Gate
        </h2>
      </div>

      <div className="grid gap-4">
        {pendingApprovals.map((visitor) => (
          <Card
            key={visitor.id}
            className="overflow-hidden border-none bg-critical/5 shadow-premium ring-2 ring-critical/20"
          >
            <CardContent className="flex flex-col items-center gap-4 p-4 sm:flex-row">
              <VisitorAvatar
                photoUrl={visitor.photo_url}
                name={visitor.visitor_name}
                className="h-20 w-20 flex-shrink-0 rounded-xl shadow-md ring-2 ring-white"
              />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-black uppercase leading-tight tracking-tight">
                  {visitor.visitor_name}
                </h3>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {visitor.visitor_type} • {visitor.purpose || "Meeting Request"}
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-xs font-bold text-muted-foreground/80 sm:justify-start">
                  <span className="flex items-center gap-1.5 rounded bg-white/50 px-2 py-0.5">
                    <Clock className="h-3 w-3" /> {formatDate(visitor.entry_time)}
                  </span>
                  {visitor.vehicle_number && (
                    <span className="flex items-center gap-1.5 rounded bg-white/50 px-2 py-0.5">
                      <Car className="h-3 w-3" /> {visitor.vehicle_number}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  variant="outline"
                  className="flex-1 border-critical text-[10px] font-bold uppercase text-critical hover:bg-critical/10 sm:flex-none"
                  onClick={() => onDeny(visitor.id)}
                  disabled={isProcessingApproval === visitor.id}
                >
                  {isProcessingApproval === visitor.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Deny
                </Button>
                <Button
                  className="flex-1 bg-success text-[10px] font-bold uppercase shadow-lg shadow-success/20 hover:bg-success/90 sm:flex-none"
                  onClick={() => onApprove(visitor.id)}
                  disabled={isProcessingApproval === visitor.id}
                >
                  {isProcessingApproval === visitor.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Confirm Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
