// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Home, Eye, EyeOff, Copy, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useRoles } from "@/hooks/useRoles";
import { useEmployees } from "@/hooks/useEmployees";
import { useUsers } from "@/hooks/useUsers";

const schema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  role_id: z.string().min(1, "Role is required"),
  employee_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface UnlinkedResident {
  id: string;
  full_name: string;
  resident_code: string;
  flats: { flat_number: string; buildings: { building_name: string } } | null;
}

interface ProvisionUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProvisionUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: ProvisionUserDialogProps) {
  const { roles: allRoles, isLoading: rolesLoading } = useRoles();
  const { employees, isLoading: employeesLoading } = useEmployees();
  const { createUser } = useUsers();

  const roles = allRoles.filter(
    (r) => r.roleKey !== "admin" && r.roleKey !== "super_admin"
  );

  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");
  const [unlinkedResidents, setUnlinkedResidents] = useState<UnlinkedResident[]>([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const isResidentRole = selectedRoleKey === "resident";

  useEffect(() => {
    if (!isResidentRole) return;
    setResidentsLoading(true);
    fetch("/api/residents/unlinked")
      .then((r) => r.json())
      .then((data) => setUnlinkedResidents(data.residents || []))
      .catch(() => setUnlinkedResidents([]))
      .finally(() => setResidentsLoading(false));
  }, [isResidentRole]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setApiError(null);

    if (isResidentRole && !selectedResidentId) {
      setApiError("Please select the resident profile to link this account to.");
      return;
    }

    try {
      const result = await createUser({
        ...values,
        resident_id: isResidentRole ? selectedResidentId : undefined,
      });

      if (result.password) {
        setGeneratedPassword(result.password);
      } else {
        onOpenChange(false);
        onSuccess();
        reset();
      }
    } catch (err: any) {
      setApiError(err.message || "An unexpected error occurred.");
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
      setApiError(null);
      setSelectedRoleKey(null);
      setSelectedResidentId("");
      setGeneratedPassword(null);
      setShowPassword(false);
    }
    onOpenChange(open);
  };

  const handleRoleChange = (roleId: string) => {
    setValue("role_id", roleId, { shouldValidate: true });
    const role = roles.find((r) => r.id === roleId);
    setSelectedRoleKey(role?.roleKey ?? null);
    setSelectedResidentId("");
  };

  const copyToClipboard = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Password copied to clipboard");
    }
  };

  if (generatedPassword) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-success" /> User Provisioned
            </DialogTitle>
            <DialogDescription>
              The account has been created successfully. Copy the temporary password below.
              It will not be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="bg-muted p-4 rounded-lg border flex items-center justify-between gap-2">
              <code className="text-lg font-mono font-bold">
                {showPassword ? generatedPassword : "••••••••••••••••"}
              </code>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Alert className="bg-warning/10 border-warning/20">
              <AlertDescription className="text-xs text-warning-foreground font-medium">
                The user must change this password upon their first login. Ensure you communicate this password securely.
              </AlertDescription>
            </Alert>

            <Button className="w-full" onClick={() => handleClose(false)}>
              Close and Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provision New User</DialogTitle>
          <DialogDescription>
            Create a system account. A temporary password will be generated for you to share.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="full_name"
              placeholder="e.g. Ravi Sharma"
              {...register("full_name")}
            />
            {errors.full_name && (
              <p className="text-destructive text-xs">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-destructive text-xs">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role_id">Role <span className="text-destructive">*</span></Label>
            <Select onValueChange={handleRoleChange} disabled={rolesLoading}>
              <SelectTrigger id="role_id">
                <SelectValue placeholder={rolesLoading ? "Loading roles…" : "Select a role"} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role_id && (
              <p className="text-destructive text-xs">{errors.role_id.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="employee_id">Link Existing Employee (Optional)</Label>
            <Select onValueChange={(val) => setValue("employee_id", val)}>
              <SelectTrigger id="employee_id">
                <SelectValue placeholder={employeesLoading ? "Loading…" : "Select employee"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None / Create New</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isResidentRole && (
            <div className="space-y-1.5">
              <Label htmlFor="resident_id">
                Link Resident Profile <span className="text-destructive">*</span>
              </Label>
              {unlinkedResidents.length === 0 && !residentsLoading ? (
                <Alert className="border-warning/30 bg-warning/10">
                  <Home className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning text-xs">
                    No unlinked resident profiles found.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select
                  onValueChange={setSelectedResidentId}
                  disabled={residentsLoading}
                >
                  <SelectTrigger id="resident_id">
                    <SelectValue placeholder={residentsLoading ? "Loading…" : "Select resident profile"} />
                  </SelectTrigger>
                  <SelectContent>
                    {unlinkedResidents.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.full_name}
                        {r.flats
                          ? ` — ${r.flats.buildings?.building_name} / Flat ${r.flats.flat_number}`
                          : ` (${r.resident_code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {apiError && (
            <p className="text-destructive text-sm font-medium">{apiError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (isResidentRole && unlinkedResidents.length === 0)}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
