"use client";

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
import { Loader2, Calendar } from "lucide-react";
import { useAdBookings } from "@/hooks/useAdBookings";

const formSchema = z.object({
  advertiser_name: z.string().min(2, "Advertiser name required"),
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().min(1, "End date required"),
  agreed_rate: z.string().min(1, "Rate required"),
  creative_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AdBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adSpaceId: string;
  adSpaceName: string;
  onSuccess?: () => void;
}

export function AdBookingDialog({
  open,
  onOpenChange,
  adSpaceId,
  adSpaceName,
  onSuccess,
}: AdBookingDialogProps) {
  const { createBooking } = useAdBookings();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      advertiser_name: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      agreed_rate: "",
      creative_url: "",
      notes: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = async (values: FormValues) => {
    const result = await createBooking({
      ad_space_id: adSpaceId,
      advertiser_name: values.advertiser_name,
      start_date: values.start_date,
      end_date: values.end_date,
      agreed_rate_paise: Math.round(parseFloat(values.agreed_rate) * 100),
      creative_url: values.creative_url || undefined,
      notes: values.notes || undefined,
    });
    if (result.success) {
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Book Ad Space
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Space: <span className="font-bold">{adSpaceName}</span>
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Advertiser / Company Name</Label>
              <Input placeholder="Acme Corp" {...form.register("advertiser_name")} />
              {form.formState.errors.advertiser_name && (
                <p className="text-xs text-destructive">{form.formState.errors.advertiser_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Start Date</Label>
                <Input type="date" {...form.register("start_date")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">End Date</Label>
                <Input type="date" {...form.register("end_date")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Agreed Rate (₹)</Label>
              <Input
                type="number"
                placeholder="5000"
                step="0.01"
                {...form.register("agreed_rate")}
              />
              {form.formState.errors.agreed_rate && (
                <p className="text-xs text-destructive">{form.formState.errors.agreed_rate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Creative / Asset URL (optional)</Label>
              <Input placeholder="https://..." {...form.register("creative_url")} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Notes</Label>
              <Textarea
                placeholder="Any special requirements..."
                className="resize-none"
                rows={2}
                {...form.register("notes")}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Submit Booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
