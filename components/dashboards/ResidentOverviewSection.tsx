"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Home, Loader2, Mail, RefreshCw, UserPlus, Wrench, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import type { ServicePriority } from "@/src/types/operations";

interface InviteVisitorPayload {
  visitor_name: string;
  visitor_type: string;
  phone?: string;
  purpose?: string;
  vehicle_number?: string;
}

interface CreateServiceRequestPayload {
  title: string;
  description: string;
  priority: ServicePriority;
}

interface ResidentOverviewSectionProps {
  resident: {
    full_name?: string | null;
    relation?: string | null;
    phone?: string | null;
    email?: string | null;
    flat?: {
      flat_number?: string | null;
      building?: {
        building_name?: string | null;
      } | null;
    } | null;
  } | null;
  activeResidents: Array<{
    fullName: string;
  }>;
  isLiveSyncConnected: boolean;
  onRefresh: () => void;
  onInviteVisitor: (payload: InviteVisitorPayload) => Promise<{ success: boolean; error?: string }>;
  onCreateRequest: (payload: CreateServiceRequestPayload) => Promise<{ success: boolean; error?: string }>;
}

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

export function ResidentOverviewSection({
  resident,
  activeResidents,
  isLiveSyncConnected,
  onRefresh,
  onInviteVisitor,
  onCreateRequest,
}: ResidentOverviewSectionProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isComplaintOpen, setIsComplaintOpen] = useState(false);
  const [complaintTitle, setComplaintTitle] = useState("");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [complaintPriority, setComplaintPriority] = useState<ServicePriority>("normal");
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<InviteFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<InviteFormData>>({});

  useEffect(() => {
    if (searchParams.get("action") === "invite") {
      setIsInviteDialogOpen(true);
    }
  }, [searchParams]);

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

  const handleInviteSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    const result = await onInviteVisitor({
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
      onRefresh();
      return;
    }

    toast({
      title: "Failed to Invite",
      description: result.error || "An error occurred.",
      variant: "destructive",
    });
  };

  const handleComplaintSubmit = async () => {
    if (!complaintTitle.trim() || !complaintDesc.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and description are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingComplaint(true);
    const result = await onCreateRequest({
      title: complaintTitle.trim(),
      description: complaintDesc.trim(),
      priority: complaintPriority,
    });
    setIsSubmittingComplaint(false);

    if (result.success) {
      toast({
        title: "Request Raised",
        description: "Your request has been submitted successfully.",
      });
      setComplaintTitle("");
      setComplaintDesc("");
      setComplaintPriority("normal");
      setIsComplaintOpen(false);
      onRefresh();
      return;
    }

    toast({
      title: "Failed",
      description: result.error || "Could not submit request.",
      variant: "destructive",
    });
  };

  const activeResidentsLabel = activeResidents.length
    ? `${activeResidents.map((resident) => resident.fullName).join(", ")} ${
        activeResidents.length === 1 ? "is" : "are"
      } also active for this flat.`
    : "You are the only active resident session for this flat right now.";

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card className="md:col-span-2 overflow-hidden border-none shadow-card ring-1 ring-border">
        <CardHeader className="border-b bg-linear-to-r from-primary/5 to-transparent pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase">
              <Home className="h-4 w-4 text-primary" />
              My Flat
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Refresh dashboard">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/30 p-3">
              <span className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Flat</span>
              <p className="text-lg font-bold">{resident?.flat?.flat_number || "Not set"}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <span className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Building</span>
              <p className="text-lg font-bold">{resident?.flat?.building?.building_name || "Not set"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 border-t pt-4">
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
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="group h-14 w-full justify-start border-border bg-card text-left text-foreground shadow-card ring-1 ring-border hover:bg-muted/30"
              variant="ghost"
            >
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold">Invite Visitor</div>
                <div className="text-[10px] text-muted-foreground">Pre-approve entry</div>
              </div>
            </Button>
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
              <div className="space-y-2">
                <Label htmlFor="visitor_name">
                  Visitor Name <span className="text-critical">*</span>
                </Label>
                <Input
                  id="visitor_name"
                  placeholder="Full name"
                  value={formData.visitor_name}
                  onChange={(event) => setFormData({ ...formData, visitor_name: event.target.value })}
                  className={formErrors.visitor_name ? "border-critical" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visitor_type">
                  Visitor Type <span className="text-critical">*</span>
                </Label>
                <Select
                  value={formData.visitor_type}
                  onValueChange={(value) => setFormData({ ...formData, visitor_type: value })}
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
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91"
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleInviteSubmit} disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Sending..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isComplaintOpen} onOpenChange={setIsComplaintOpen}>
          <DialogTrigger asChild>
            <Button
              className="group h-14 w-full justify-start border-border bg-card text-left text-foreground shadow-card ring-1 ring-border hover:bg-muted/30"
              variant="ghost"
            >
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 transition-colors group-hover:bg-warning/20">
                <Wrench className="h-5 w-5 text-warning" />
              </div>
              <div>
                <div className="text-sm font-bold">Raise Request</div>
                <div className="text-[10px] text-muted-foreground">Report an issue</div>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-warning" />
                Raise a Service Request
              </DialogTitle>
              <DialogDescription>Describe the issue or service needed.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="complaint_title">
                  Title <span className="text-critical">*</span>
                </Label>
                <Input
                  id="complaint_title"
                  placeholder="e.g. Water leakage"
                  value={complaintTitle}
                  onChange={(event) => setComplaintTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complaint_desc">
                  Description <span className="text-critical">*</span>
                </Label>
                <Textarea
                  id="complaint_desc"
                  placeholder="Details..."
                  className="min-h-[100px] resize-none"
                  value={complaintDesc}
                  onChange={(event) => setComplaintDesc(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={complaintPriority}
                  onValueChange={(value) => setComplaintPriority(value as ServicePriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsComplaintOpen(false)} disabled={isSubmittingComplaint}>
                Cancel
              </Button>
              <Button onClick={handleComplaintSubmit} disabled={isSubmittingComplaint} className="gap-2">
                {isSubmittingComplaint && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="border-none shadow-card ring-1 ring-border">
          <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide">
                {isLiveSyncConnected ? "Live queue sync active" : "Live queue sync reconnecting"}
              </p>
              <p className="text-xs text-muted-foreground">{activeResidentsLabel}</p>
            </div>
            <Button variant="outline" className="text-[10px] font-bold uppercase">
              {activeResidents.length} collaborator{activeResidents.length === 1 ? "" : "s"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
