import { Loader2 } from "lucide-react";
import { BrandMark } from "@/components/branding/BrandLogo";
import { BRAND_NAME, BRAND_PORTAL_LABEL } from "@/src/lib/brand";

export default function Loading() {
  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
      <BrandMark className="h-20 w-20" priority />
      <div className="relative flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
        <Loader2 className="absolute h-8 w-8 animate-spin text-primary" style={{ animationDuration: '1.5s' }} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <h3 className="text-lg font-bold tracking-tight text-foreground/80">
          Loading {BRAND_NAME}
        </h3>
        <p className="text-sm text-muted-foreground animate-pulse">
          Preparing the {BRAND_PORTAL_LABEL.toLowerCase()}...
        </p>
      </div>
    </div>
  );
}
