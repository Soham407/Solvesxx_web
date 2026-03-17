"use client";

import { QrBatchGenerator } from "@/components/qr-codes/QrBatchGenerator";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/hooks/useAuth";

export default function QrCodesPage() {
  const { user } = useAuth();
  
  // Get society ID from user profile — only pass if it's a real UUID
  const societyId = user?.user_metadata?.society_id;

  return (
    <div className="flex-1 space-y-6 p-8">
      <PageHeader
        title="QR Code Management"
        description="Generate and manage QR codes for asset tracking"
      />
      {societyId ? (
        <QrBatchGenerator societyId={societyId} />
      ) : (
        <p className="text-sm text-muted-foreground">No society associated with your account. Contact your administrator.</p>
      )}
    </div>
  );
}
