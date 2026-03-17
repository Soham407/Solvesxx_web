"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { ServicePurchaseOrder } from "@/hooks/useServicePurchaseOrders";

const formSchema = z.object({
  headcount_received: z.coerce.number().min(0, "Must be 0 or more"),
  grade_verified: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceAcknowledgmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spo: ServicePurchaseOrder;
  onConfirm: () => void;
}

export function ServiceAcknowledgmentDialog({
  open,
  onOpenChange,
  spo,
  onConfirm,
}: ServiceAcknowledgmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      headcount_received: 0,
      grade_verified: false,
      notes: "",
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from("service_acknowledgments")
        .insert({
          spo_id: spo.id,
          acknowledged_by: user?.id ?? null,
          headcount_expected: null,
          headcount_received: values.headcount_received,
          grade_verified: values.grade_verified,
          notes: values.notes || null,
        });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("service_purchase_orders")
        .update({ status: "deployment_confirmed", updated_at: new Date().toISOString() })
        .eq("id", spo.id);

      if (updateError) throw updateError;

      toast({ title: "Deployment confirmed", description: `SPO ${spo.spo_number} has been acknowledged.` });
      form.reset();
      onOpenChange(false);
      onConfirm();
    } catch (err: any) {
      console.error("Acknowledgment error:", err);
      toast({ title: "Error", description: err.message || "Failed to acknowledge deployment", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Acknowledge Deployment
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            SPO: <span className="font-mono font-bold">{spo.spo_number}</span>
            {" · "}{spo.service_type}
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Headcount Received</Label>
              <Input
                type="number"
                min={0}
                placeholder="Number of personnel received"
                {...form.register("headcount_received")}
              />
              {form.formState.errors.headcount_received && (
                <p className="text-xs text-destructive">{form.formState.errors.headcount_received.message}</p>
              )}
            </div>

            <Separator />

            <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20">
              <Checkbox
                id="grade_verified"
                checked={form.watch("grade_verified")}
                onCheckedChange={(checked) => form.setValue("grade_verified", !!checked)}
              />
              <div className="flex flex-col">
                <Label htmlFor="grade_verified" className="text-sm font-bold cursor-pointer">
                  Grade / Role Verified
                </Label>
                <p className="text-xs text-muted-foreground">
                  All deployed personnel match the required qualification and role
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Acknowledgment Notes</Label>
              <Textarea
                placeholder="Any observations or remarks about this deployment..."
                rows={3}
                {...form.register("notes")}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm Deployment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
