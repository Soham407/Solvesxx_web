"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useEmployees } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { RequestKanbanCard } from "./RequestKanbanCard";
import { RequestKanbanColumn } from "./RequestKanbanColumn";
import { ServiceRequest } from "@/src/types/phaseB";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Define status columns
const STATUS_COLUMNS = [
  {
    id: "open",
    title: "Open",
    color: "bg-gray-100 border-gray-200",
    headerColor: "text-gray-700",
    icon: Clock,
  },
  {
    id: "assigned",
    title: "Assigned",
    color: "bg-blue-50 border-blue-200",
    headerColor: "text-blue-700",
    icon: Play,
  },
  {
    id: "in_progress",
    title: "In Progress",
    color: "bg-yellow-50 border-yellow-200",
    headerColor: "text-yellow-700",
    icon: AlertCircle,
  },
  {
    id: "on_hold",
    title: "On Hold",
    color: "bg-orange-50 border-orange-200",
    headerColor: "text-orange-700",
    icon: Pause,
  },
  {
    id: "completed",
    title: "Completed",
    color: "bg-green-50 border-green-200",
    headerColor: "text-green-700",
    icon: CheckCircle2,
  },
  {
    id: "cancelled",
    title: "Cancelled",
    color: "bg-red-50 border-red-200",
    headerColor: "text-red-700",
    icon: XCircle,
  },
];

// Priority colors
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 border-blue-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

interface RequestKanbanProps {
  filterByAssignee?: string;
  showFilters?: boolean;
}

export function RequestKanban({ filterByAssignee, showFilters = true }: RequestKanbanProps) {
  const { requests, isLoading, updateRequest } = useServiceRequests();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  
  // Scroll indicators
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  // Scroll handlers
  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
  };

  // Set up scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollPosition();
    container.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [checkScrollPosition, filteredRequests]);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Filter requests
  useEffect(() => {
    let filtered = requests;

    if (filterByAssignee) {
      filtered = filtered.filter((r) => r.assigned_to === filterByAssignee);
    }

    if (priorityFilter) {
      filtered = filtered.filter((r) => r.priority === priorityFilter);
    }

    setFilteredRequests(filtered as any);
  }, [requests, filterByAssignee, priorityFilter]);

  // Group requests by status
  const getRequestsByStatus = (status: string) => {
    return filteredRequests.filter((r) => r.status === status);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const request = requests.find((r) => r.id === active.id);
    if (request) {
      setActiveRequest(request as any);
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setActiveRequest(null);
      return;
    }

    const requestId = active.id as string;
    const newStatus = over.id as string;

    // Check if dropped on a status column
    if (STATUS_COLUMNS.some((col) => col.id === newStatus)) {
      const request = requests.find((r) => r.id === requestId);
      
      if (request && request.status !== newStatus) {
        // Update request status - cast to valid status type
        const validStatus = newStatus as "open" | "assigned" | "in_progress" | "on_hold" | "completed" | "cancelled";
        const result = await updateRequest(requestId, { status: validStatus });

        if (result.success) {
          toast({
            title: "Status Updated",
            description: `Request moved to ${STATUS_COLUMNS.find((c) => c.id === newStatus)?.title}`,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to update request status",
            variant: "destructive",
          });
        }
      }
    }

    setActiveId(null);
    setActiveRequest(null);
  };

  // Get employee name
  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) return "Unassigned";
    const employee = employees.find((e) => e.id === employeeId);
    return employee?.full_name || "Unknown";
  };

  // Get employee initials
  const getEmployeeInitials = (employeeId: string | null) => {
    if (!employeeId) return "?";
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee?.full_name) return "?";
    return employee.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by Priority:</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={priorityFilter === null ? "default" : "outline"}
              size="sm"
              onClick={() => setPriorityFilter(null)}
            >
              All
            </Button>
            {["low", "medium", "high", "critical"].map((priority) => (
              <Button
                key={priority}
                variant={priorityFilter === priority ? "default" : "outline"}
                size="sm"
                onClick={() => setPriorityFilter(priority)}
                className="capitalize"
              >
                {priority}
              </Button>
            ))}
          </div>
          <div className="ml-auto">
            <Button size="sm" asChild>
              <Link href="/service-requests/new">
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="relative">
          {/* Left scroll indicator */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-4 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          )}
          {canScrollLeft && (
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background shadow-lg border-2"
              onClick={scrollLeft}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Scrollable container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto pb-4 min-h-[600px] scroll-smooth"
            style={{ scrollbarWidth: 'thin' }}
          >
            {STATUS_COLUMNS.map((column) => {
              const columnRequests = getRequestsByStatus(column.id);
              const Icon = column.icon;

              return (
                <RequestKanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  headerColor={column.headerColor}
                  count={columnRequests.length}
                  icon={Icon}
                >
                  <SortableContext
                    items={columnRequests.map((r) => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {columnRequests.map((request: any) => (
                        <RequestKanbanCard
                          key={request.id}
                          request={request as ServiceRequest}
                          priorityColor={PRIORITY_COLORS[request.priority || 'low'] || "bg-gray-100"}
                          assigneeName={getEmployeeName(request.assigned_to)}
                          assigneeInitials={getEmployeeInitials(request.assigned_to)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </RequestKanbanColumn>
              );
            })}
          </div>

          {/* Right scroll indicator */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          )}
          {canScrollRight && (
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background shadow-lg border-2"
              onClick={scrollRight}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeRequest ? (
            <Card className="cursor-grabbing shadow-lg rotate-2">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className={PRIORITY_COLORS[activeRequest.priority || 'low'] || 'bg-gray-100'}>
                      {activeRequest.priority || 'low'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      #{activeRequest.request_number}
                    </span>
                  </div>
                  <p className="font-medium line-clamp-2">{activeRequest.description}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getEmployeeInitials(activeRequest.assigned_to)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {getEmployeeName(activeRequest.assigned_to)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <div>
          Showing {filteredRequests.length} of {requests.length} requests
        </div>
        <div className="flex gap-4">
          {STATUS_COLUMNS.map((col) => (
            <div key={col.id} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${col.headerColor.replace("text-", "bg-")}`} />
              <span>
                {col.title}: {getRequestsByStatus(col.id).length}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
