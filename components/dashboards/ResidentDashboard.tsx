"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Home,
  Users,
  UserPlus,
  Clock,
  Building,
  Phone,
  Mail,
  Calendar,
  Car,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  Bell,
  Shield,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useResident } from "@/hooks/useResident";
import { useResidentProfileWithFallback } from "@/hooks/useResidentProfile";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { getSignedVisitorPhotoUrl } from "@/lib/visitorPhotoStorage";

interface InviteFormData {
  visitor_name: string;
  visitor_type: string;
  phone: string;
  purpose: string;
  vehicle_number: string;
}

const initialFormData: InviteFormData = {
  visitor_name: "",
  visitor_type: "guest",
  phone: "",
  purpose: "",
  vehicle_number: "",
};

function VisitorAvatar({ 
  photoUrl, 
  name 
}: { 
  photoUrl?: string | null; 
  name: string; 
}) {
  const [url, setUrl] = useState<string | null>(null);

  // Fetch signed URL if photoUrl exists
  useEffect(() => {
    if (photoUrl) {
      getSignedVisitorPhotoUrl(photoUrl)
        .then((signedUrl) => {
          if (signedUrl) setUrl(signedUrl);
        })
        .catch((err) => {
          console.error("Error fetching signed URL:", err);
          setUrl(null);
        });
    }
  }, [photoUrl]);

  if (url) {
    return (
      <div className="h-10 w-10 rounded-full border bg-muted flex items-center justify-center shrink-0 overflow-hidden relative">
        <img 
          src={url} 
          alt={name} 
          className="h-full w-full object-cover" 
          onError={() => setUrl(null)}
        />
      </div>
    );
  }

  // Fallback to initials
  return (
    <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
      <span className="text-sm font-bold text-primary">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export function ResidentDashboard() {
  const { toast } = useToast();
  const { isLoading: isAuthLoading } = useAuth();
  
  // Get authenticated resident profile
  const { 
    residentId, 
    fullName: profileFullName,
    isLoading: isProfileLoading, 
    error: profileError 
  } = useResidentProfileWithFallback();

  // Show loading while auth/profile is being fetched
  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  // Show login prompt if not authenticated (and not in dev mode with mock)
  if (!residentId) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Home className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Authentication Required</h2>
        <p className="text-sm text-muted-foreground text-center">
          {profileError || "Please log in to access the Resident Dashboard."}
        </p>
        <a href="/login" className="text-sm text-primary hover:underline font-medium">
          Go to Login →
        </a>
      </div>
    );
  }

  return <ResidentDashboardContent residentId={residentId} />;
}

// Internal component that receives validated residentId
function ResidentDashboardContent({ residentId }: { residentId: string }) {
  const { toast } = useToast();
  const {
    resident,
    visitors,
    isLoading,
    isLoadingVisitors,
    error,
    inviteVisitor,
    refresh,
    refreshVisitors,
  } = useResident(residentId);

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") === "invite") {
      setIsInviteDialogOpen(true);
    }
  }, [searchParams]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<InviteFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<InviteFormData>>({});

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<InviteFormData> = {};

    if (!formData.visitor_name.trim()) {
      errors.visitor_name = "Visitor name is required";
    }
    if (!formData.visitor_type) {
      errors.visitor_type = "Visitor type is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleInviteSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    const result = await inviteVisitor({
      visitor_name: formData.visitor_name.trim(),
      visitor_type: formData.visitor_type,
      phone: formData.phone.trim() || undefined,
      purpose: formData.purpose.trim() || undefined,
      vehicle_number: formData.vehicle_number.trim() || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Visitor Invited",
        description: `${formData.visitor_name} has been pre-approved for entry.`,
      });
      setFormData(initialFormData);
      setIsInviteDialogOpen(false);
    } else {
      toast({
        title: "Failed to Invite",
        description: result.error || "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format date for display
  const formatDate = (isoString: string | null) => {
    if (!isoString) return "Pending";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get visitor type badge color
  const getVisitorTypeBadge = (type: string | null) => {
    switch (type) {
      case "guest":
        return "bg-info/10 text-info border-info/20";
      case "vendor":
        return "bg-warning/10 text-warning border-warning/20";
      case "contractor":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "service_staff":
        return "bg-success/10 text-success border-success/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-critical/20 bg-critical/5 max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-critical mx-auto mb-4" />
            <h3 className="text-lg font-bold text-critical mb-2">Unable to Load</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={refresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, {resident?.full_name?.split(" ")[0] || "Resident"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your flat and visitor access
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={refresh} aria-label="Refresh dashboard">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Flat Details Card */}
      <Card className="border-none shadow-card ring-1 ring-border overflow-hidden">
        <CardHeader className="pb-3 border-b bg-linear-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" />
              My Flat
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-bold">
              {resident?.relation?.toUpperCase() || "RESIDENT"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Flat Number */}
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Home className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase">Flat</span>
              </div>
              <p className="text-lg font-bold">
                {resident?.flat?.flat_number || "N/A"}
              </p>
            </div>

            {/* Building */}
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Building className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase">Building</span>
              </div>
              <p className="text-lg font-bold">
                {resident?.flat?.building?.building_name || "N/A"}
              </p>
            </div>

            {/* Floor */}
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Building className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase">Floor</span>
              </div>
              <p className="text-lg font-bold">
                {resident?.flat?.floor_number ?? "N/A"}
              </p>
            </div>

            {/* Flat Type */}
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Home className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase">Type</span>
              </div>
              <p className="text-lg font-bold uppercase">
                {resident?.flat?.flat_type || "N/A"}
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4">
            {resident?.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{resident.phone}</span>
              </div>
            )}
            {resident?.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span>{resident.email}</span>
              </div>
            )}
            {resident?.move_in_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  Since{" "}
                  {new Date(resident.move_in_date).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        {/* Invite Visitor Button */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Card className="border-none shadow-card ring-1 ring-border p-4 cursor-pointer hover:bg-muted/30 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">Invite Visitor</h3>
                  <p className="text-xs text-muted-foreground">
                    Pre-approve guest entry
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Invite a Visitor
              </DialogTitle>
              <DialogDescription>
                Pre-approve a visitor for entry. The guard will be notified.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Visitor Name */}
              <div className="space-y-2">
                <Label htmlFor="visitor_name">
                  Visitor Name <span className="text-critical">*</span>
                </Label>
                <Input
                  id="visitor_name"
                  placeholder="Enter visitor's full name"
                  value={formData.visitor_name}
                  onChange={(e) =>
                    setFormData({ ...formData, visitor_name: e.target.value })
                  }
                  className={formErrors.visitor_name ? "border-critical" : ""}
                />
                {formErrors.visitor_name && (
                  <p className="text-xs text-critical">{formErrors.visitor_name}</p>
                )}
              </div>

              {/* Visitor Type */}
              <div className="space-y-2">
                <Label htmlFor="visitor_type">
                  Visitor Type <span className="text-critical">*</span>
                </Label>
                <Select
                  value={formData.visitor_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, visitor_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="vendor">Vendor / Delivery</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="service_staff">Service Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Visit</Label>
                <Input
                  id="purpose"
                  placeholder="e.g., Dinner, Repair work"
                  value={formData.purpose}
                  onChange={(e) =>
                    setFormData({ ...formData, purpose: e.target.value })
                  }
                />
              </div>

              {/* Vehicle Number */}
              <div className="space-y-2">
                <Label htmlFor="vehicle_number">Vehicle Number (Optional)</Label>
                <Input
                  id="vehicle_number"
                  placeholder="MH-12-AB-1234"
                  value={formData.vehicle_number}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_number: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsInviteDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteSubmit}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Sending..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notifications Card - Coming Soon */}
        <Card className="border-none shadow-card ring-1 ring-border p-4 cursor-default opacity-75">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-muted-foreground">Notifications</h3>
              <p className="text-xs text-muted-foreground/70">Coming soon</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity / Visitors */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="pb-3 border-b bg-muted/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshVisitors}
              disabled={isLoadingVisitors}
              className="h-8 text-xs"
            >
              {isLoadingVisitors ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingVisitors ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : visitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                No visitor activity yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Invite your first visitor to get started
              </p>
            </div>
          ) : (
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {visitors.map((visitor) => (
                <div
                  key={visitor.id}
                  className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Avatar */}
                  <VisitorAvatar 
                    photoUrl={visitor.photo_url} 
                    name={visitor.visitor_name} 
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm truncate">
                        {visitor.visitor_name}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-bold uppercase shrink-0",
                          getVisitorTypeBadge(visitor.visitor_type)
                        )}
                      >
                        {visitor.visitor_type?.replace("_", " ") || "Guest"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(visitor.entry_time)}
                      </span>
                      {visitor.vehicle_number && (
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          {visitor.vehicle_number}
                        </span>
                      )}
                    </div>
                    {visitor.purpose && (
                      <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                        {visitor.purpose}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="shrink-0 text-right">
                    {visitor.exit_time ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] bg-muted text-muted-foreground"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Exited
                      </Badge>
                    ) : visitor.entry_time ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] bg-success/10 text-success border-success/20"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Inside
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[9px] bg-warning/10 text-warning border-warning/20"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Expected
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-none bg-muted/30">
        <CardContent className="p-4 flex items-center gap-4">
          <Shield className="h-8 w-8 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Security Notice:</strong> All
              visitor data shown is specific to your flat. Pre-approved visitors
              will be verified by security at the gate.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
