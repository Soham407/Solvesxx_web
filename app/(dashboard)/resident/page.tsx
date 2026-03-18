import { Suspense } from "react";
import { ResidentDashboard } from "@/components/dashboards/ResidentDashboard";
import { Loader2 } from "lucide-react";

export default function ResidentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <div className="p-6">
        <ResidentDashboard />
      </div>
    </Suspense>
  );
}
