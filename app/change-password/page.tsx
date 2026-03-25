// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/src/lib/supabaseClient";

const ROLE_REDIRECTS: Record<string, string> = {
  buyer:               "/buyer",
  supplier:            "/supplier",
  vendor:              "/supplier",
  resident:            "/resident",
  delivery_boy:        "/delivery",
  security_guard:      "/guard",
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
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("must_change_password")
        .eq("id", user.id)
        .single();

      if (!(userData as any)?.must_change_password) {
        // Already changed — send to role dashboard, not blindly to /dashboard
        const { data: roleData } = await supabase
          .from("users")
          .select("roles(role_name)")
          .eq("id", user.id)
          .single();
        const roleName = (roleData as any)?.roles?.role_name;
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

      toast.success("Password updated successfully!");

      // Refresh session then redirect to role dashboard
      await supabase.auth.refreshSession();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("roles(role_name)")
          .eq("id", user.id)
          .single();

        const roleName = (userData as any)?.roles?.role_name;
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
      <div className="min-h-screen flex items-center justify-center bg-[#070a0f]">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#070a0f]">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-warning/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-warning/20 border border-warning/30 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-warning" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">FacilityPro</h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-[0.2em] font-medium">
            Security Setup Required
          </p>
        </div>

        <Card className="border-white/5 bg-white/[0.03] backdrop-blur-xl shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-warning via-orange-500 to-destructive" />

          <CardHeader className="pt-8 pb-4">
            <CardTitle className="text-2xl text-white font-bold text-center tracking-tight">
              Change Your Password
            </CardTitle>
            <CardDescription className="text-gray-400 text-center pt-2">
              Your account was provisioned with a temporary password. You must set a new password before accessing FacilityPro.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Alert className="mb-5 border-warning/30 bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning text-sm font-medium">
                This is required for account security. You cannot skip this step.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="new-password"
                  className="text-gray-300 text-xs font-semibold uppercase tracking-wider"
                >
                  New Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    id="new-password"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="bg-white/5 border-white/10 text-white pl-10 h-11 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirm-password"
                  className="text-gray-300 text-xs font-semibold uppercase tracking-wider"
                >
                  Confirm Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="bg-white/5 border-white/10 text-white pl-10 h-11 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all placeholder:text-gray-500"
                  />
                </div>
              </div>

              {error && (
                <p className="text-destructive text-sm font-medium">{error}</p>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold text-base shadow-glow group transition-all duration-300"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      Set New Password
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-[10px] text-gray-600 text-center mt-6">
          &copy; {new Date().getFullYear()} FacilityPro Enterprise
        </p>
      </div>
    </div>
  );
}
