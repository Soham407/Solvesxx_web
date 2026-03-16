"use client";

import { RequestKanban } from "@/components/service-requests/RequestKanban";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function ServiceRequestsKanbanPage() {
  return (
    <div className="flex-1 space-y-6 p-8">
      <PageHeader
        title="Service Requests Board"
        description="Drag and drop requests to update their status"
      >
        <Button asChild>
          <Link href="/service-requests/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </PageHeader>
      <RequestKanban />
    </div>
  );
}
