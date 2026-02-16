"use client";

import { useAuth } from "@/hooks/useAuth";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Allow 'admin', 'supplier', or 'vendor' roles
  if (!user || (role !== "admin" && role !== "supplier" && role !== "vendor")) {
    redirect("/dashboard");
  }

  return <div className="p-6 space-y-6">{children}</div>;
}
