"use client";

import { useState, useMemo } from "react";
import {
  CalendarClock,
  Search,
  Plus,
  Filter,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Loader2,
  Package,
  MapPin,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import type { DueMaintenanceSchedule } from "@/src/types/phaseB";
import { MAINTENANCE_FREQUENCY_LABELS } from "@/src/lib/constants";

interface MaintenanceScheduleListProps {
  onScheduleSelect?: (schedule: DueMaintenanceSchedule) => void;
  onCreateNew?: () => void;
  onCreateServiceRequest?: (schedule: DueMaintenanceSchedule) => void;
}

export function MaintenanceScheduleList({
  onScheduleSelect,
  onCreateNew,
  onCreateServiceRequest,
}: MaintenanceScheduleListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFrequency, setSelectedFrequency] = useState<string>("");
  const [showDueSoon, setShowDueSoon] = useState(false);

  const {
    schedules,
    dueSchedules,
    isLoading,
    error,
    markAsPerformed,
    refresh,
  } = useMaintenanceSchedules();

  // Filter schedules based on search and filters
  const filteredSchedules = useMemo(() => {
    // Use dueSchedules if showing due soon, otherwise use all schedules
    const sourceData = showDueSoon ? dueSchedules : schedules;
    
    return sourceData.filter((schedule) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const taskName = schedule.task_name?.toLowerCase() || "";
        const description = schedule.task_description?.toLowerCase() || "";
        if (!taskName.includes(searchLower) && !description.includes(searchLower)) {
          return false;
        }
      }
      
      // Frequency filter
      if (selectedFrequency && selectedFrequency !== 'all' && schedule.frequency !== selectedFrequency) {
        return false;
      }
      
      return true;
    });
  }, [schedules, dueSchedules, searchTerm, selectedFrequency, showDueSoon]);

  // Apply filters
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filters are applied reactively via useMemo
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedFrequency("all");
    setShowDueSoon(false);
  };

  // Toggle due soon filter
  const toggleDueSoon = () => {
    setShowDueSoon(!showDueSoon);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not scheduled";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Get days until due
  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get schedule display data (works with both MaintenanceSchedule and DueMaintenanceSchedule)
  const getScheduleDisplayData = (schedule: DueMaintenanceSchedule | typeof schedules[0]) => {
    // Check if it's a DueMaintenanceSchedule (from view) which has joined data
    const isDueSchedule = 'asset_name' in schedule;
    return {
      id: schedule.id,
      taskName: schedule.task_name || "Maintenance Task",
      description: schedule.task_description,
      frequency: schedule.frequency,
      nextDueDate: schedule.next_due_date,
      assetName: isDueSchedule ? (schedule as DueMaintenanceSchedule).asset_name : undefined,
      locationName: isDueSchedule ? (schedule as DueMaintenanceSchedule).location_name : undefined,
    };
  };

  return (
    <div className="space-y-6">
      {/* Due Soon Alert */}
      {dueSchedules.length > 0 && (
        <Card className="border-none shadow-sm ring-1 ring-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-warning">
                  {dueSchedules.length} Maintenance{dueSchedules.length > 1 ? "s" : ""} Due Soon
                </p>
                <p className="text-xs text-muted-foreground">
                  Within the next 7 days
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-warning text-warning hover:bg-warning/10"
                onClick={toggleDueSoon}
              >
                View All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Maintenance Schedules
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              {onCreateNew && (
                <Button size="sm" className="gap-1" onClick={onCreateNew}>
                  <Plus className="h-4 w-4" />
                  New Schedule
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Filter Form */}
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search schedules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedFrequency} onValueChange={setSelectedFrequency}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(MAINTENANCE_FREQUENCY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={showDueSoon ? "destructive" : "outline"}
              size="sm"
              className="gap-1"
              onClick={toggleDueSoon}
            >
              <Clock className="h-4 w-4" />
              Due Soon
            </Button>
            <Button type="submit" size="icon" variant="secondary">
              <Filter className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear
            </Button>
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
              <Button variant="ghost" size="sm" onClick={refresh}>
                Retry
              </Button>
            </div>
          )}

          {/* Schedule List */}
          {!isLoading && !error && (
            <div className="space-y-3">
              {filteredSchedules.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">No schedules found</p>
                </div>
              ) : (
                filteredSchedules.map((schedule) => {
                  const displayData = getScheduleDisplayData(schedule);
                  const daysUntilDue = getDaysUntilDue(displayData.nextDueDate);
                  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                  const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;

                  return (
                    <div
                      key={displayData.id}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors",
                        isOverdue && "border-destructive/50 bg-destructive/5",
                        isDueSoon && !isOverdue && "border-warning/50 bg-warning/5",
                        onScheduleSelect && "cursor-pointer"
                      )}
                      onClick={() => onScheduleSelect?.(schedule as DueMaintenanceSchedule)}
                    >
                      {/* Status Indicator */}
                      <div
                        className={cn(
                          "h-12 w-12 rounded-lg flex items-center justify-center shrink-0",
                          isOverdue
                            ? "bg-destructive/20"
                            : isDueSoon
                            ? "bg-warning/20"
                            : "bg-primary/10"
                        )}
                      >
                        <CalendarClock
                          className={cn(
                            "h-6 w-6",
                            isOverdue
                              ? "text-destructive"
                              : isDueSoon
                              ? "text-warning"
                              : "text-primary"
                          )}
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{displayData.taskName}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {MAINTENANCE_FREQUENCY_LABELS[displayData.frequency || "monthly"]}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-[10px]">
                              Overdue
                            </Badge>
                          )}
                          {isDueSoon && !isOverdue && (
                            <Badge variant="outline" className="text-[10px] border-warning text-warning">
                              Due Soon
                            </Badge>
                          )}
                        </div>
                        {displayData.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {displayData.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          {displayData.assetName && (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {displayData.assetName}
                            </span>
                          )}
                          {displayData.locationName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {displayData.locationName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {formatDate(displayData.nextDueDate)}
                            {daysUntilDue !== null && (
                              <span
                                className={cn(
                                  "ml-1",
                                  isOverdue
                                    ? "text-destructive font-medium"
                                    : isDueSoon
                                    ? "text-warning font-medium"
                                    : ""
                                )}
                              >
                                ({daysUntilDue === 0
                                  ? "Today"
                                  : daysUntilDue < 0
                                  ? `${Math.abs(daysUntilDue)} days overdue`
                                  : `in ${daysUntilDue} days`})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onCreateServiceRequest && (
                            <DropdownMenuItem
                              onClick={() => onCreateServiceRequest(schedule as DueMaintenanceSchedule)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create Service Request
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => displayData.id && markAsPerformed(displayData.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Completed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Schedule count */}
          {!isLoading && !error && filteredSchedules.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Showing {filteredSchedules.length} schedule{filteredSchedules.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
