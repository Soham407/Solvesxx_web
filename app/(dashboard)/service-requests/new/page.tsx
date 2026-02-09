"use client";

import { ServiceRequestForm } from "@/components/phaseB/ServiceRequestForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export default function CreateServiceRequestPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "Success",
      description: "Service request created successfully",
    });
    router.push("/service-requests");
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <PageHeader
        title="Create Service Request"
        description="Submit a new service or maintenance request"
      />
      <ServiceRequestForm onSuccess={handleSuccess} />
    </div>
  );
}
