"use client";

import { useState } from "react";
import {
  ClipboardList,
  Search,
  Plus,
  Filter,
  MoreVertical,
  User,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
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
import { useServiceRequests } from "@/hooks/useServiceRequests";
import type { ServiceRequestWithDetails, ServiceRequestFilters } from "@/src/types/operations";
import {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_COLORS,
  SERVICE_PRIORITY_LABELS,
  SERVICE_PRIORITY_COLORS,
} from "@/src/lib/constants";

interface ServiceRequestListProps {
  onRequestSelect?: (request: ServiceRequestWithDetails) => void;
  onCreateNew?: () => void;
  onAssign?: (request: ServiceRequestWithDetails) => void;
  onStartJob?: (request: ServiceRequestWithDetails) => void;
}

export function ServiceRequestList({
  onRequestSelect,
  onCreateNew,
  onAssign,
  onStartJob,
}: ServiceRequestListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  const {
    requests,
    totalCount,
    currentPage,
    pageSize,
    isLoading,
    error,
    stats,
    setFilters,
    setPage,
    completeRequest,
    cancelRequest,
    refresh,
  } = useServiceRequests();

  // Apply filters
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const filters: ServiceRequestFilters = {};
    if (searchTerm) filters.searchTerm = searchTerm;
    if (selectedStatus && selectedStatus !== "all") filters.status = selectedStatus as ServiceRequestFilters["status"];
    if (selectedPriority && selectedPriority !== "all") filters.priority = selectedPriority as ServiceRequestFilters["priority"];
    setFilters(filters);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedPriority("all");
    setFilters({});
  };

  // Pagination
  const totalPages = Math.ceil(totalCount / pageSize);

  // Time ago formatter
  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Open</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.openRequests}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-amber-500">{stats.inProgressRequests}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Completed Today</p>
                  <p className="text-2xl font-bold text-success">{stats.completedToday}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Urgent</p>
                  <p className="text-2xl font-bold text-destructive">{stats.urgentRequests}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-destructive/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filters */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Service Requests
            </CardTitle>
            {onCreateNew && (
              <Button size="sm" className="gap-1" onClick={onCreateNew}>
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Filter Form */}
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(SERVICE_REQUEST_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {Object.entries(SERVICE_PRIORITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Request List */}
          {!isLoading && !error && (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">No service requests found</p>
                </div>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors",
                      onRequestSelect && "cursor-pointer"
                    )}
                    onClick={() => onRequestSelect?.(request)}
                  >
                    {/* Priority Indicator */}
                    <div
                      className="h-12 w-1 rounded-full shrink-0"
                      style={{
                        backgroundColor: SERVICE_PRIORITY_COLORS[request.priority || "normal"],
                      }}
                    />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {request.request_number}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            borderColor: SERVICE_PRIORITY_COLORS[request.priority || "normal"],
                            color: SERVICE_PRIORITY_COLORS[request.priority || "normal"],
                          }}
                        >
                          {SERVICE_PRIORITY_LABELS[request.priority || "normal"]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            borderColor: SERVICE_REQUEST_STATUS_COLORS[request.status || "open"],
                            color: SERVICE_REQUEST_STATUS_COLORS[request.status || "open"],
                          }}
                        >
                          {SERVICE_REQUEST_STATUS_LABELS[request.status || "open"]}
                        </Badge>
                      </div>
                      <p className="font-semibold mt-1 truncate">
                        {request.title || request.service_name || "Service Request"}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {request.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        {request.asset_name && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {request.asset_name}
                          </span>
                        )}
                        {request.location_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {request.location_name}
                          </span>
                        )}
                        {request.technician_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {request.technician_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(request.created_at)}
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
                        {request.status === "open" && onAssign && (
                          <DropdownMenuItem onClick={() => onAssign(request)}>
                            <User className="h-4 w-4 mr-2" />
                            Assign Technician
                          </DropdownMenuItem>
                        )}
                        {(request.status === "assigned" || request.status === "in_progress") &&
                          onStartJob && (
                            <DropdownMenuItem onClick={() => onStartJob(request)}>
                              <Clock className="h-4 w-4 mr-2" />
                              {request.status === "assigned" ? "Start Job" : "Continue Job"}
                            </DropdownMenuItem>
                          )}
                        {request.status !== "completed" && request.status !== "cancelled" && request.id && (
                          <>
                            <DropdownMenuItem
                              onClick={() => completeRequest(request.id!)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => cancelRequest(request.id!)}
                            >
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
