// @ts-nocheck
"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { useRoles } from "@/hooks/useRoles";

const schema = z
  .object({
    full_name: z.string().min(2, "Full name is required"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().optional(),
    role_id: z.string().min(1, "Role is required"),
    temp_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm the password"),
  })
  .refine((d) => d.temp_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type FormValues = z.infer<typeof schema>;

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
  // Exclude admin-tier roles — the API blocks them too, but better to not show them at all
  const roles = allRoles.filter((r) => r.roleKey !== "admin" && r.roleKey !== "super_admin");
  const [apiError, setApiError] = useState<string | null>(null);

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

    try {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: values.full_name,
          email: values.email,
          phone: values.phone || null,
          role_id: values.role_id,
          temp_password: values.temp_password,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setApiError(result.error || "Failed to create user");
        return;
      }

      toast.success("User provisioned", {
        description: `${values.full_name} can now log in with the temporary password.`,
      });

      reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      setApiError("An unexpected error occurred. Please try again.");
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
      setApiError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Provision New User</DialogTitle>
          <DialogDescription>
            Create a system account. The user must change the temporary password on their first login.
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
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              {...register("phone")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role_id">Role <span className="text-destructive">*</span></Label>
            <Select
              onValueChange={(val) => setValue("role_id", val, { shouldValidate: true })}
              disabled={rolesLoading}
            >
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
            <Label htmlFor="temp_password">
              Temporary Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="temp_password"
              type="password"
              placeholder="Min. 8 characters"
              {...register("temp_password")}
            />
            {errors.temp_password && (
              <p className="text-destructive text-xs">{errors.temp_password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">
              Confirm Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Re-enter password"
              {...register("confirm_password")}
            />
            {errors.confirm_password && (
              <p className="text-destructive text-xs">{errors.confirm_password.message}</p>
            )}
          </div>

          {apiError && (
            <p className="text-destructive text-sm font-medium">{apiError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
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
