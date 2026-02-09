"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ServiceRequest } from "@/src/types/phaseB";
import { Calendar, Clock } from "lucide-react";
import Link from "next/link";

interface RequestKanbanCardProps {
  request: ServiceRequest;
  priorityColor: string;
  assigneeName: string;
  assigneeInitials: string;
}

export function RequestKanbanCard({
  request,
  priorityColor,
  assigneeName,
  assigneeInitials,
}: RequestKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: request.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Check if overdue
  const isOverdue = () => {
    if (!request.scheduled_date || request.status === "completed" || request.status === "cancelled") {
      return false;
    }
    return new Date(request.scheduled_date) < new Date();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <Link href={`/service-requests/${request.id}`}>
        <Card
          className={`cursor-grab hover:shadow-md transition-shadow ${
            isDragging ? "cursor-grabbing shadow-lg" : ""
          }`}
        >
          <CardContent className="p-4 space-y-3">
            {/* Header: Priority & Request Number */}
            <div className="flex items-start justify-between">
              <Badge variant="outline" className={`text-xs ${priorityColor}`}>
                {request.priority}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                #{request.request_number}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm font-medium line-clamp-2">
              {request.description}
            </p>

            {/* Service Type */}
            {(request as any).service_name && (
              <div className="text-xs text-muted-foreground">
                {(request as any).service_name}
              </div>
            )}

            {/* Footer: Assignee & Dates */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-primary/10">
                    {assigneeInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                  {assigneeName}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {request.scheduled_date && (
                  <div className={`flex items-center gap-1 ${isOverdue() ? "text-red-500" : ""}`}>
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(request.scheduled_date)}</span>
                    {isOverdue() && <span className="text-red-500 font-medium">!</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Created Date */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Created {formatDate(request.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
