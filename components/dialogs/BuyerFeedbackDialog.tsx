"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Star, Loader2, MessageSquare } from "lucide-react";
import { useBuyerFeedback } from "@/hooks/useBuyerFeedback";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  overall_rating: z.number().min(1, "Please rate overall experience").max(5),
  quality_rating: z.number().min(1).max(5).optional(),
  delivery_rating: z.number().min(1).max(5).optional(),
  professionalism_rating: z.number().min(1).max(5).optional(),
  would_recommend: z.boolean(),
  comments: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface StarRatingProps {
  value: number;
  onChange: (val: number) => void;
  label: string;
  required?: boolean;
}

function StarRating({ value, onChange, label, required }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                (hovered || value) >= star
                  ? "fill-warning text-warning"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-xs text-muted-foreground self-center">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][value]}
          </span>
        )}
      </div>
    </div>
  );
}

interface BuyerFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  requestNumber: string;
  onSuccess?: () => void;
}

export function BuyerFeedbackDialog({
  open,
  onOpenChange,
  requestId,
  requestNumber,
  onSuccess,
}: BuyerFeedbackDialogProps) {
  const { isSubmitting, submitFeedback } = useBuyerFeedback();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      overall_rating: 0,
      quality_rating: 0,
      delivery_rating: 0,
      professionalism_rating: 0,
      would_recommend: true,
      comments: "",
    },
  });

  const handleSubmit = async (values: FormValues) => {
    const result = await submitFeedback({
      requestId,
      overall_rating: values.overall_rating,
      quality_rating: values.quality_rating || undefined,
      delivery_rating: values.delivery_rating || undefined,
      professionalism_rating: values.professionalism_rating || undefined,
      would_recommend: values.would_recommend,
      comments: values.comments,
    });
    if (result.success) {
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Leave Feedback
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Request: <span className="font-mono font-bold">{requestNumber}</span>
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-5 py-2">
            {/* Overall Rating */}
            <Controller
              control={form.control}
              name="overall_rating"
              render={({ field }) => (
                <StarRating
                  label="Overall Experience"
                  value={field.value}
                  onChange={field.onChange}
                  required
                />
              )}
            />
            {form.formState.errors.overall_rating && (
              <p className="text-xs text-destructive -mt-3">
                {form.formState.errors.overall_rating.message}
              </p>
            )}

            <Separator />

            {/* Category Ratings */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="quality_rating"
                render={({ field }) => (
                  <StarRating
                    label="Quality"
                    value={field.value || 0}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="delivery_rating"
                render={({ field }) => (
                  <StarRating
                    label="Delivery"
                    value={field.value || 0}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="professionalism_rating"
                render={({ field }) => (
                  <StarRating
                    label="Professionalism"
                    value={field.value || 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <Separator />

            {/* Would Recommend */}
            <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
              <Label className="text-sm font-medium cursor-pointer">
                Would you recommend this service?
              </Label>
              <Controller
                control={form.control}
                name="would_recommend"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Comments */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Additional Comments</Label>
              <Textarea
                placeholder="Tell us about your experience..."
                className="resize-none"
                rows={3}
                {...form.register("comments")}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Star className="h-4 w-4" />
              )}
              Submit Feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
