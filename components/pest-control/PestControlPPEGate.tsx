"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePestControlPPE, PPEChecklistData } from "@/hooks/usePestControlPPE";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PestControlPPEGateProps {
  serviceRequestId: string;
  technicianId: string;
  jobSessionId?: string;
  onVerified?: () => void;
  className?: string;
}

const CHECKLIST_ITEMS = [
  { id: "gloves_worn", label: "Gloves worn" },
  { id: "mask_worn", label: "Mask/Respirator worn" },
  { id: "goggles_worn", label: "Safety goggles" },
  { id: "full_suit_worn", label: "Full body suit" },
  { id: "chemical_dilution_verified", label: "Chemical dilution verified" },
  { id: "resident_area_cleared", label: "Resident area cleared" },
];

export function PestControlPPEGate({
  serviceRequestId,
  technicianId,
  jobSessionId,
  onVerified,
  className,
}: PestControlPPEGateProps) {
  const { ppeVerification, submitPPEChecklist, isLoading } = usePestControlPPE(jobSessionId, serviceRequestId);
  
  const [formData, setFormData] = useState<PPEChecklistData>({
    gloves_worn: false,
    mask_worn: false,
    goggles_worn: false,
    full_suit_worn: false,
    chemical_dilution_verified: false,
    resident_area_cleared: false,
  });

  const isVerified = ppeVerification?.all_items_checked === true;

  useEffect(() => {
    if (ppeVerification) {
      setFormData({
        gloves_worn: ppeVerification.gloves_worn,
        mask_worn: ppeVerification.mask_worn,
        goggles_worn: ppeVerification.goggles_worn,
        full_suit_worn: ppeVerification.full_suit_worn,
        chemical_dilution_verified: ppeVerification.chemical_dilution_verified,
        resident_area_cleared: ppeVerification.resident_area_cleared,
      });
    }
  }, [ppeVerification]);

  const handleToggle = (id: keyof PPEChecklistData) => {
    if (isVerified) return;
    setFormData((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleVerify = async () => {
    const allChecked = Object.values(formData).every((v) => v === true);
    if (!allChecked) {
      toast.error("Please verify all PPE items before proceeding.");
      return;
    }

    try {
      const result = await submitPPEChecklist(formData, technicianId);

      if (result.success) {
        toast.success("PPE Verification completed successfully.");
        if (onVerified) onVerified();
      } else {
        toast.error(result.error || "Failed to submit PPE verification.");
      }
    } catch (err) {
      toast.error("An error occurred during PPE verification.");
    }
  };

  const allChecked = Object.values(formData).every((v) => v === true);

  return (
    <Card 
      className={cn(
        "transition-all duration-300",
        isVerified ? "border-green-100 bg-green-50/30" : "border-amber-100 bg-amber-50/30 shadow-md",
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {isVerified ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-amber-600" />
          )}
          Pest Control PPE Verification
        </CardTitle>
        <CardDescription>
          {isVerified 
            ? "Safety protocols verified for this job." 
            : "Required safety checklist before job completion."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {CHECKLIST_ITEMS.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <Checkbox
                id={`ppe-${item.id}`}
                checked={formData[item.id as keyof PPEChecklistData]}
                onCheckedChange={() => handleToggle(item.id as keyof PPEChecklistData)}
                disabled={isVerified || isLoading}
                className={cn(isVerified && "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600")}
              />
              <Label
                htmlFor={`ppe-${item.id}`}
                className={cn(
                  "text-sm font-medium leading-none cursor-pointer",
                  isVerified && "text-green-800"
                )}
              >
                {item.label}
              </Label>
            </div>
          ))}
        </div>

        {!isVerified && (
          <Button
            className="w-full bg-amber-600 hover:bg-amber-700 mt-2"
            onClick={handleVerify}
            disabled={isLoading || !allChecked}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Verify Safety Gear
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
