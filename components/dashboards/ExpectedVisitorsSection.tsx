"use client";

import { Loader2, LogIn, UserCheck, Building, Phone, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGuardVisitors } from "@/hooks/useGuardVisitors";
import { toast } from "@/components/ui/sonner";

interface ExpectedVisitorsSectionProps {
  gateLocation?: {
    id: string;
    latitude: number;
    longitude: number;
    geo_fence_radius: number;
    location_name: string;
  } | null;
}

function showToast({
  title,
  description,
  variant,
}: {
  title: string;
  description?: string;
  variant?: string;
}) {
  if (variant === "destructive") {
    toast.error(title, { description });
  } else {
    toast.success(title, { description });
  }
}

export function ExpectedVisitorsSection({ gateLocation }: ExpectedVisitorsSectionProps) {
  const { expectedVisitors, isLoading, isCheckingIn, checkInVisitor } = useGuardVisitors();

  const handleCheckIn = async (visitorId: string, visitorName: string) => {
    const result = await checkInVisitor(visitorId, undefined, gateLocation?.id);

    if (result.success) {
      showToast({
        title: "Visitor Checked In",
        description: `${visitorName} has been checked in successfully.`,
      });
    } else {
      showToast({
        title: "Check-In Failed",
        description: result.error || "Could not check in visitor.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-2">Loading expected visitors...</p>
        </CardContent>
      </Card>
    );
  }

  if (expectedVisitors.length === 0) {
    return (
      <Card className="border-none shadow-card ring-1 ring-border bg-muted/20">
        <CardContent className="p-6 text-center">
          <UserCheck className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No Expected Visitors</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Pre-approved visitors will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-card ring-1 ring-border overflow-hidden">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-success/5 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-success" />
            Expected Visitors
          </CardTitle>
          <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
            {expectedVisitors.length} PRE-APPROVED
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y max-h-[300px] overflow-y-auto">
          {expectedVisitors.map((visitor) => (
            <div
              key={visitor.id}
              className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-success">
                  {visitor.visitor_name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm truncate">{visitor.visitor_name}</p>
                  <Badge
                    variant="outline"
                    className="text-[8px] font-bold uppercase bg-success/10 text-success border-success/20"
                  >
                    PRE-APPROVED
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {visitor.flat && (
                    <span className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {visitor.flat.building?.building_name} - {visitor.flat.flat_number}
                    </span>
                  )}
                  {visitor.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {visitor.phone}
                    </span>
                  )}
                  {visitor.vehicle_number && (
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {visitor.vehicle_number}
                    </span>
                  )}
                </div>
                {visitor.purpose && (
                  <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">
                    Purpose: {visitor.purpose}
                  </p>
                )}
              </div>

              <Button
                size="sm"
                className="shrink-0 bg-success hover:bg-success/90 gap-1 h-8 text-xs"
                disabled={isCheckingIn === visitor.id}
                onClick={() => handleCheckIn(visitor.id, visitor.visitor_name)}
              >
                {isCheckingIn === visitor.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <LogIn className="h-3 w-3" />
                )}
                Check In
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
