"use client";

import { useState } from "react";
import { Award, BookOpen, Fingerprint, Pencil, ShieldAlert, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployees } from "@/hooks/useEmployees";
import { TechnicianProfile, useTechnicians } from "@/hooks/useTechnicians";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function toCommaSeparated(values: string[] | undefined) {
  return (values || []).join(", ");
}

function parseCommaSeparated(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const INITIAL_FORM = {
  employee_id: "",
  skills: "",
  certifications: "",
  is_active: "true",
};

export default function SpecializedProfilesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TechnicianProfile | null>(null);
  const [profileForm, setProfileForm] = useState(INITIAL_FORM);
  const { technicians, isLoading, addTechnician, updateTechnician } = useTechnicians();
  const { employees } = useEmployees();

  const assignedEmployeeIds = new Set(technicians.map((technician) => technician.employee_id));
  const availableEmployees = employees.filter(
    (employee) =>
      !assignedEmployeeIds.has(employee.id) || employee.id === editingProfile?.employee_id
  );

  const resetDialog = () => {
    setEditingProfile(null);
    setProfileForm(INITIAL_FORM);
  };

  const openCreateDialog = () => {
    resetDialog();
    setIsDialogOpen(true);
  };

  const openEditDialog = (profile: TechnicianProfile) => {
    setEditingProfile(profile);
    setProfileForm({
      employee_id: profile.employee_id,
      skills: toCommaSeparated(profile.skills),
      certifications: toCommaSeparated(profile.certifications),
      is_active: profile.is_active ? "true" : "false",
    });
    setIsDialogOpen(true);
  };

  const saveProfile = async () => {
    if (!profileForm.employee_id) {
      toast.error("Select an employee before saving the specialized profile.");
      return;
    }

    const profilePayload = {
      employee_id: profileForm.employee_id,
      skills: parseCommaSeparated(profileForm.skills),
      certifications: parseCommaSeparated(profileForm.certifications),
      is_active: profileForm.is_active === "true",
    };

    setIsSubmitting(true);
    try {
      if (editingProfile) {
        const { success, error } = await updateTechnician(editingProfile.id, profilePayload);
        if (!success) {
          throw new Error(error || "Failed to update specialized profile");
        }
        toast.success("Specialized profile updated.");
      } else {
        const { success, error } = await addTechnician(profilePayload);
        if (!success) {
          throw new Error(error || "Failed to create specialized profile");
        }
        toast.success("Specialized profile created.");
      }

      setIsDialogOpen(false);
      resetDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save specialized profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Specialized Personnel Profiles"
        description="High-security roles requiring ballistic training, surveillance certifications, and enhanced background vetting."
        actions={
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                resetDialog();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm" onClick={openCreateDialog}>
                <UserPlus className="h-4 w-4" /> Add Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingProfile ? "Edit Specialized Profile" : "Add Specialized Profile"}
                </DialogTitle>
                <DialogDescription>
                  Assign a technician profile to an employee and capture their skill and certification inventory.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="specialized_employee">Employee</Label>
                  <Select
                    value={profileForm.employee_id}
                    onValueChange={(value) =>
                      setProfileForm((prev) => ({ ...prev, employee_id: value }))
                    }
                  >
                    <SelectTrigger id="specialized_employee">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.full_name} ({employee.employee_code || "No code"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialized_skills">Skills</Label>
                  <Input
                    id="specialized_skills"
                    value={profileForm.skills}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, skills: event.target.value }))
                    }
                    placeholder="Gas charging, central plant, electrical diagnostics"
                  />
                  <p className="text-[11px] text-muted-foreground">Separate multiple skills with commas.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialized_certifications">Certifications</Label>
                  <Input
                    id="specialized_certifications"
                    value={profileForm.certifications}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, certifications: event.target.value }))
                    }
                    placeholder="HVAC Cert v1, Safety Diploma"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Separate multiple certifications with commas.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialized_status">Profile Status</Label>
                  <Select
                    value={profileForm.is_active}
                    onValueChange={(value) =>
                      setProfileForm((prev) => ({ ...prev, is_active: value }))
                    }
                  >
                    <SelectTrigger id="specialized_status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetDialog();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={saveProfile} disabled={isSubmitting || !profileForm.employee_id}>
                  {isSubmitting && <Award className="mr-2 h-4 w-4 animate-pulse" />}
                  Save Profile
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <Card key={index} className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="p-6 pb-2">
                <Skeleton className="mb-4 h-5 w-24" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-4 space-y-4 border-t border-dashed p-6 pt-6">
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : technicians.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed bg-muted/20 p-12 text-center">
          <UserX className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <h3 className="text-lg font-bold">No Specialized Profiles Found</h3>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
            No active technician profiles exist yet. Add a profile from this screen to make technicians visible in HRMS operations and service assignment views.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {technicians.map((tech) => (
            <Card
              key={tech.id}
              className="group border-none shadow-card ring-1 ring-border transition-all hover:ring-primary/20"
            >
              <CardHeader className="p-6 pb-2">
                <div className="mb-4 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="max-w-[160px] truncate border-primary/20 bg-primary/5 text-[10px] font-bold uppercase text-primary"
                  >
                    {tech.designation ?? "Specialist"}
                  </Badge>
                  <div className={`h-2 w-2 rounded-full ${tech.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                </div>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-background ring-2 ring-primary/5 shadow-xl">
                    {tech.photo_url && <AvatarImage src={tech.photo_url} alt={tech.full_name} />}
                    <AvatarFallback className="bg-muted text-lg font-bold">
                      {getInitials(tech.full_name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex flex-1 flex-col text-left">
                    <CardTitle className="truncate text-xl font-bold">{tech.full_name}</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      ID: {tech.employee_code ?? "-"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-4 space-y-4 border-t border-dashed p-6 pt-6">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Skills</p>
                  {tech.skills && tech.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tech.skills.map((skill) => (
                        <Badge key={`${tech.id}-${skill}`} variant="secondary" className="text-[10px] font-semibold">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] italic text-muted-foreground">No skills recorded</p>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Certifications</p>
                  {tech.certifications && tech.certifications.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tech.certifications.map((certification) => (
                        <Badge
                          key={`${tech.id}-${certification}`}
                          variant="outline"
                          className="border-success/20 bg-success/5 text-[10px] font-semibold text-success"
                        >
                          {certification}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] italic text-muted-foreground">No certifications recorded</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className={`flex-1 justify-center py-1 text-[10px] font-bold uppercase ${
                      tech.is_active
                        ? "border-success/20 bg-success/5 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tech.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => openEditDialog(tech)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-3xl border-2 border-dashed bg-muted/20 p-8 text-center">
        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
        <h3 className="text-lg font-bold">Certification Compliance Vault</h3>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
          Specialized personnel still require annual arms license verification and psychological vetting.
          This screen now manages the operational profile inventory; document evidence remains in the HR governance workflow.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Badge variant="secondary" className="gap-2 px-3 py-1 font-bold">
            <Fingerprint className="h-3.5 w-3.5 text-primary" /> Biometric Verified
          </Badge>
          <Badge variant="secondary" className="gap-2 px-3 py-1 font-bold">
            <BookOpen className="h-3.5 w-3.5 text-info" /> Background Clear
          </Badge>
        </div>
      </div>
    </div>
  );
}
