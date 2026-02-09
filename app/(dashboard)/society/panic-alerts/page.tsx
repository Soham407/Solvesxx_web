"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  AlertTriangle, 
  MapPin, 
  Phone, 
  BellRing, 
  CheckCircle,
  Clock,
  ShieldAlert,
  Navigation,
  ExternalLink,
  ChevronRight,
  Loader2,
  RefreshCw,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePanicAlertHistory, PanicAlert, AlertType } from "@/hooks/usePanicAlertHistory";
import { useEmergencyContacts } from "@/hooks/useEmergencyContacts";

export default function PanicAlertsPage() {
  const {
    alerts,
    activeAlerts,
    stats,
    isLoading,
    error,
    resolveAlert,
    getAlertTypeLabel,
    getTimeAgo,
    filters,
    setFilters,
    refresh,
  } = usePanicAlertHistory();

  const { contacts, isLoading: contactsLoading } = useEmergencyContacts();

  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PanicAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  // Handle resolve
  const handleResolve = async () => {
    if (!selectedAlert) return;
    
    setIsResolving(true);
    const result = await resolveAlert(selectedAlert.id, resolutionNotes);
    setIsResolving(false);
    
    if (result.success) {
      setResolveDialogOpen(false);
      setSelectedAlert(null);
      setResolutionNotes("");
    }
  };

  // Open resolve dialog
  const openResolveDialog = (alert: PanicAlert) => {
    setSelectedAlert(alert);
    setResolveDialogOpen(true);
  };

  // Get guard name
  const getGuardName = (alert: PanicAlert): string => {
    if (alert.guard?.employee) {
      return `Guard: ${alert.guard.employee.first_name} ${alert.guard.employee.last_name}`;
    }
    return `Guard: ${alert.guard?.guard_code || "Unknown"}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={refresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Panic Response Center"
        description="Real-time emergency monitoring and SOS alert coordination hub."
        actions={
          <Button 
            variant="destructive" 
            className="gap-2 animate-pulse shadow-lg shadow-destructive/20 font-bold uppercase tracking-widest text-[10px] h-11 px-6"
          >
            <ShieldAlert className="h-4 w-4" /> Trigger Emergency
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select 
          value={filters.status || "all"} 
          onValueChange={(val) => setFilters({ ...filters, status: val as "active" | "resolved" | "all" })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Alerts</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.type || "all"} 
          onValueChange={(val) => setFilters({ ...filters, type: val === "all" ? undefined : val as AlertType })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Alert Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="panic">Panic/SOS</SelectItem>
            <SelectItem value="inactivity">Inactivity</SelectItem>
            <SelectItem value="geo_fence_breach">Geo-fence Breach</SelectItem>
            <SelectItem value="checklist_incomplete">Checklist Missed</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Active Emergency Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <BellRing className="h-4 w-4 text-critical" /> Emergency Feed
            </h3>
            <Badge variant="outline" className="text-critical bg-critical/5 border-critical/20 font-bold px-3">
              {stats.activeThreats} Active Threats
            </Badge>
          </div>

          {/* Alert List */}
          <div className="grid gap-4">
            {alerts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <CardDescription>No alerts found matching your filters</CardDescription>
                </CardContent>
              </Card>
            ) : (
              alerts.map((alert) => (
                <Card 
                  key={alert.id} 
                  className={cn(
                    "border-none shadow-premium overflow-hidden transition-all duration-300",
                    !alert.is_resolved ? "ring-2 ring-critical animate-pulse-soft" : "ring-1 ring-border"
                  )}
                >
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className={cn(
                        "w-2 shrink-0",
                        !alert.is_resolved ? "bg-critical" : "bg-success"
                      )} />
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg",
                              !alert.is_resolved 
                                ? "bg-critical text-white shadow-critical/20" 
                                : "bg-success text-white shadow-success/20"
                            )}>
                              <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-lg">
                                  {getAlertTypeLabel(alert.alert_type)} {!alert.is_resolved && "Emergency"}
                                </span>
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase font-bold border-current/20 font-mono italic">
                                  {alert.id.slice(0, 8)}
                                </Badge>
                              </div>
                              <span className="text-sm font-medium text-muted-foreground">
                                {getGuardName(alert)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "text-xs font-bold uppercase",
                              !alert.is_resolved ? "text-critical" : "text-success"
                            )}>
                              {getTimeAgo(alert.alert_time)}
                            </span>
                            {alert.latitude && alert.longitude && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium justify-end">
                                <Navigation className="h-3 w-3" /> GPS Captured
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="p-3 rounded-xl bg-muted/50 border border-dashed flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Incident Location</span>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              <span className="text-sm font-bold">
                                {alert.location?.location_name || "Unknown Location"}
                              </span>
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-muted/50 border border-dashed flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Response Status</span>
                              <span className="text-sm font-bold">
                                {alert.is_resolved ? "Resolved" : "Active"}
                              </span>
                            </div>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Resolution Notes (if resolved) */}
                        {alert.is_resolved && alert.resolution_notes && (
                          <div className="p-3 rounded-xl bg-success/5 border border-success/20 mb-4">
                            <span className="text-[10px] uppercase font-bold text-success tracking-widest">Resolution Notes</span>
                            <p className="text-sm mt-1">{alert.resolution_notes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {!alert.is_resolved && (
                            <Button 
                              className="flex-1 gap-2 bg-critical hover:bg-critical/90 shadow-lg shadow-critical/20"
                              onClick={() => openResolveDialog(alert)}
                            >
                              <CheckCircle className="h-4 w-4" /> Resolve Incident
                            </Button>
                          )}
                          <Button variant="outline" className="flex-1 gap-2 border-primary/20 hover:bg-primary/5">
                            <ChevronRight className="h-4 w-4" /> View Details
                          </Button>
                          <Button variant="ghost" size="icon" className="shrink-0 border">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Sidebar / Tools */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Emergency Contacts</h3>
          <Card className="border-none shadow-card ring-1 ring-border">
            <CardContent className="p-0">
              <div className="divide-y">
                {contactsLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="p-8 text-center">
                    <CardDescription>No emergency contacts configured</CardDescription>
                  </div>
                ) : (
                  contacts.slice(0, 4).map((contact) => (
                    <div key={contact.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group cursor-pointer">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold group-hover:text-primary transition-colors">{contact.contact_name}</span>
                        <span className="text-xs text-muted-foreground">{contact.contact_type}</span>
                        <span className="text-xs font-mono font-bold mt-1 text-foreground/80">{contact.phone_number}</span>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                        <Phone className="h-4 w-4" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Response Protocol */}
          <Card className="bg-primary text-primary-foreground border-none shadow-premium relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldAlert className="h-24 w-24" />
            </div>
            <CardHeader>
              <CardTitle className="text-lg">Response Protocol</CardTitle>
              <CardDescription className="text-primary-foreground/70">Automatic workflows initiated upon panic triggers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm font-medium">
              <div className="flex gap-3 items-center">
                <div className="h-6 w-6 rounded bg-white/20 flex items-center justify-center text-[10px]">1</div>
                <span>SMS notifications to Society Committee</span>
              </div>
              <div className="flex gap-3 items-center">
                <div className="h-6 w-6 rounded bg-white/20 flex items-center justify-center text-[10px]">2</div>
                <span>GPS Tracking pinned to Manager Dashboard</span>
              </div>
              <div className="flex gap-3 items-center">
                <div className="h-6 w-6 rounded bg-white/20 flex items-center justify-center text-[10px]">3</div>
                <span>Logging of guard-side camera footage</span>
              </div>
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <Card className="border-none shadow-card ring-1 ring-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase">Today's Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Alerts</span>
                <span className="font-bold">{stats.totalToday}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Resolved</span>
                <span className="font-bold text-success">{stats.resolvedToday}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active</span>
                <span className="font-bold text-critical">{stats.activeThreats}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution Notes</label>
              <Textarea
                placeholder="Describe how this incident was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={isResolving}>
              {isResolving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
