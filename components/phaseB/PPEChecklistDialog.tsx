"use client";

import { useState, useRef, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, CheckCircle2, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePestControlInventory } from "@/hooks/usePestControlInventory";

interface PPEChecklistDialogProps {
  onSubmitComplete?: () => void;
  children: React.ReactNode;
}

interface PPEItem {
  item: string;
  verified: boolean;
  mandatory: boolean;
}

export function PPEChecklistDialog({ 
  onSubmitComplete,
  children 
}: PPEChecklistDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState("");
  const { toast } = useToast();
  const { submitPPEVerification } = usePestControlInventory();
  
  const [ppeItems, setPpeItems] = useState<PPEItem[]>([
    { item: "Chemical Resistant Gloves", mandatory: true, verified: false },
    { item: "N95 Respiration Mask", mandatory: true, verified: false },
    { item: "Protective Eyewear/Goggles", mandatory: true, verified: false },
    { item: "First Aid & Spill Kit", mandatory: true, verified: false },
  ]);

  const toggleItem = (index: number) => {
    setPpeItems(prev => prev.map((item, i) => 
      i === index ? { ...item, verified: !item.verified } : item
    ));
  };

  const handleSubmit = async () => {
    // Check if all mandatory items are verified
    const unverifiedMandatory = ppeItems.filter(item => item.mandatory && !item.verified);
    
    if (unverifiedMandatory.length > 0) {
      toast({
        title: "Mandatory Items Not Verified",
        description: `Please verify all mandatory items: ${unverifiedMandatory.map(i => i.item).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Get employee ID
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (empError || !empData) {
        throw new Error("Employee record not found");
      }

      const result = await submitPPEVerification({
        technician_id: empData.id,
        items: ppeItems,
        site_readiness_report: report,
        status: "verified",
      });

      if (!result) {
        throw new Error("Failed to submit verification");
      }

      toast({
        title: "Site Readiness Report Submitted",
        description: "PPE verification has been recorded successfully.",
      });

      // Reset and close
      setPpeItems(prev => prev.map(item => ({ ...item, verified: false })));
      setReport("");
      setIsOpen(false);
      onSubmitComplete?.();

    } catch (err) {
      console.error("Submit error:", err);
      toast({
        title: "Submission Failed",
        description: err instanceof Error ? err.message : "Failed to submit verification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allVerified = ppeItems.every(item => !item.mandatory || item.verified);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Site Readiness Verification
          </DialogTitle>
          <DialogDescription>
            Verify all PPE items before site dispatch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* PPE Checklist */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">PPE Checklist</Label>
            <div className="space-y-2">
              {ppeItems.map((item, index) => (
                <div 
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer",
                    item.verified 
                      ? "bg-success/5 border-success/20" 
                      : "bg-background border-border hover:bg-muted/50"
                  )}
                  onClick={() => toggleItem(index)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
                      item.verified ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                    )}>
                      {item.verified ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{item.item}</span>
                      {item.mandatory && (
                        <span className="text-[10px] text-critical font-medium">*Required</span>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold uppercase",
                    item.verified 
                      ? "bg-success/10 text-success" 
                      : "bg-warning/10 text-warning"
                  )}>
                    {item.verified ? "Verified" : "Pending"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Site Readiness Report */}
          <div className="space-y-2">
            <Label htmlFor="report" className="text-sm font-semibold">
              Site Readiness Report
            </Label>
            <Textarea
              id="report"
              placeholder="Enter any additional notes about site readiness..."
              value={report}
              onChange={(e) => setReport(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Status Indicator */}
          {!allVerified && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-xs text-warning font-medium">
                Please verify all mandatory items before submitting
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !allVerified}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Submit Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
