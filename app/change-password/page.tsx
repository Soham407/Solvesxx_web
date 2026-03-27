"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Lock,
  Shield,
  Sparkles,
} from "lucide-react";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/src/lib/supabaseClient";
import {
  BRAND_LEGAL_NAME,
  BRAND_NAME,
  BRAND_PORTAL_LABEL,
} from "@/src/lib/brand";

type UserPasswordRow = {
  must_change_password?: boolean | null;
  roles?: { role_name?: string | null } | null;
};

const ROLE_REDIRECTS: Record<string, string> = {
  buyer: "/buyer",
  supplier: "/supplier",
  vendor: "/supplier",
  resident: "/resident",
  delivery_boy: "/delivery",
  security_guard: "/guard",
  security_supervisor: "/guard",
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function guardCheck() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("must_change_password")
        .eq("id", user.id)
        .single();

      const passwordRow = userData as UserPasswordRow | null;

      if (!passwordRow?.must_change_password) {
        const { data: roleData } = await supabase
          .from("users")
          .select("roles(role_name)")
          .eq("id", user.id)
          .single();
        const roleName = (roleData as UserPasswordRow | null)?.roles?.role_name;
        router.replace(ROLE_REDIRECTS[roleName] ?? "/dashboard");
        return;
      }

      setIsChecking(false);
    }

    guardCheck();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to change password.");
        setIsLoading(false);
        return;
      }

      toast.success("Password updated successfully.");

      await supabase.auth.refreshSession();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("roles(role_name)")
          .eq("id", user.id)
          .single();

        const roleName = (userData as UserPasswordRow | null)?.roles?.role_name;
        router.push(ROLE_REDIRECTS[roleName] ?? "/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="brand-shell flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo className="w-24" priority />
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="brand-shell relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-44 w-44 rounded-br-[5rem] bg-primary" />
        <div className="absolute right-0 top-0 h-44 w-44 rounded-bl-[5rem] bg-[linear-gradient(145deg,#c3a257,#f2e08a)]" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-tr-[5rem] bg-primary/90" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="brand-navy-panel brand-cut-corner hidden rounded-[2rem] p-10 shadow-[0_30px_90px_-44px_rgba(10,63,99,0.68)] lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex rounded-[2rem] bg-white px-5 py-4 shadow-xl">
              <BrandLogo className="w-28" priority />
            </div>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.32em] text-sidebar-primary/90">
              {BRAND_PORTAL_LABEL}
            </p>
            <h1 className="mt-4 text-5xl font-semibold leading-[0.96] text-white">
              Complete your secure
              <br />
              account setup.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-white/78">
              Your first sign-in to {BRAND_NAME} requires a password change so your
              workspace is protected before you access live operations data.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.35rem] border border-white/12 bg-white/8 px-5 py-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c3a257,#f2e08a)] text-primary shadow-lg">
                  <Shield className="h-4 w-4" />
                </div>
                <p className="text-lg font-semibold text-white">Security first</p>
              </div>
              <p className="text-sm leading-relaxed text-white/72">
                This step prevents temporary credentials from being reused across the
                facility operations portal.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-white/12 bg-white/8 px-5 py-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c3a257,#f2e08a)] text-primary shadow-lg">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-lg font-semibold text-white">One clean setup</p>
              </div>
              <p className="text-sm leading-relaxed text-white/72">
                Once updated, you will be redirected to your assigned dashboard or
                portal automatically.
              </p>
            </div>
          </div>
        </section>

        <section className="brand-surface brand-cut-corner relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#c3a257,#f2e08a)]" />
          <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-warning/18 blur-3xl" />

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-fit rounded-[1.75rem] bg-secondary p-4 ring-1 ring-border/70">
              <BrandLogo className="w-20 sm:w-24" priority />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-warning">
                {BRAND_LEGAL_NAME}
              </p>
              <h2 className="mt-2 text-4xl font-semibold text-primary">
                Set your new password
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                This is required before you can continue into the {BRAND_NAME} portal.
                Choose a password you will remember and keep it private.
              </p>
            </div>
          </div>

          <Alert className="mb-6 border-warning/30 bg-warning/10 text-warning">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              This is a mandatory first-login step. You cannot skip it.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="new-password"
                className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80"
              >
                New Password
              </Label>
              <div className="group relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-12 rounded-2xl border-border/80 bg-white pl-10 shadow-sm focus-visible:border-warning focus-visible:ring-warning/35"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirm-password"
                className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80"
              >
                Confirm Password
              </Label>
              <div className="group relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="h-12 rounded-2xl border-border/80 bg-white pl-10 shadow-sm focus-visible:border-warning focus-visible:ring-warning/35"
                />
              </div>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-2xl text-base font-semibold">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Updating password...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  Save and Continue
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>

          <div className="mt-8 rounded-[1.5rem] border border-border/70 bg-secondary/55 px-5 py-4">
            <p className="text-sm font-semibold text-primary">Why we ask for this</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Temporary passwords are only for onboarding. This update protects your
              access to procurement records, workforce data, and live operational
              actions in {BRAND_NAME}.
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {BRAND_NAME}. {BRAND_LEGAL_NAME}.
          </p>
        </section>
      </div>
    </div>
  );
}
