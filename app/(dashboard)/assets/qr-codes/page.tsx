"use client";

import { QrBatchGenerator } from "@/components/qr-codes/QrBatchGenerator";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/hooks/useAuth";

export default function QrCodesPage() {
  const { user } = useAuth();
  
  // Get society ID from user profile or default
  const societyId = user?.user_metadata?.society_id || "default";

  return (
    <div className="flex-1 space-y-6 p-8">
      <PageHeader
        title="QR Code Management"
        description="Generate and manage QR codes for asset tracking"
      />
      <QrBatchGenerator societyId={societyId} />
    </div>
  );
}
