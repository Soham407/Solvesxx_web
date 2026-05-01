"use client";

import { useAuth } from "@/hooks/useAuth";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { canAccessPath } from "@/src/lib/platform/permissions";
import { getRoleLandingPath } from "@/src/lib/auth/roles";

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  const { user, role, permissions, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    redirect("/login");
  }

  if (!role || !canAccessPath(role, permissions, "/supplier")) {
    redirect(getRoleLandingPath(role));
  }

  return <div className="p-6 space-y-6">{children}</div>;
}
