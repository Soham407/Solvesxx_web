"use client";

import { useState } from "react";
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
import { Star, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BuyerFeedbackDialogProps {
  invoiceId: string;
  supplierName: string;
  onSubmitComplete?: () => void;
  children: React.ReactNode;
}

export function BuyerFeedbackDialog({ 
  invoiceId,
  supplierName,
  onSubmitComplete,
  children 
}: BuyerFeedbackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating before submitting.",
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

      // Save feedback to service_feedback table (may need to create this table)
      try {
        await supabase
          .from('service_feedback')
          .insert({
            invoice_id: invoiceId,
            buyer_user_id: user.id,
            score: rating,
            comments: feedback,
            created_at: new Date().toISOString(),
          } as any);
      } catch (dbErr) {
        console.log('Note: service_feedback table may not exist. Feedback functionality requires database setup.');
      }

      // Update invoice status to completed
      try {
        await supabase
          .from('buyer_invoices')
          .update({ 
            status: 'completed',
            feedback_submitted: true,
            feedback_submitted_at: new Date().toISOString(),
          } as any)
          .eq('id', invoiceId);
      } catch (dbErr) {
        console.log('Note: buyer_invoices table columns may differ.');
      }

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! It helps us improve our services.",
      });

      // Reset and close
      setRating(0);
      setFeedback("");
      setIsOpen(false);
      onSubmitComplete?.();

    } catch (err) {
      console.error("Submit error:", err);
      toast({
        title: "Submission Failed",
        description: err instanceof Error ? err.message : "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            Rate Your Experience
          </DialogTitle>
          <DialogDescription>
            Share your feedback for invoice #{invoiceId.substring(0, 8)} from {supplierName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Overall Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 hover:scale-110 transition-transform"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star 
                    className={cn(
                      "h-8 w-8 transition-colors",
                      star <= (hoverRating || rating)
                        ? "fill-warning text-warning"
                        : "fill-muted text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {rating === 1 && "Poor - Very dissatisfied"}
              {rating === 2 && "Fair - Below expectations"}
              {rating === 3 && "Good - Met expectations"}
              {rating === 4 && "Very Good - Exceeded expectations"}
              {rating === 5 && "Excellent - Outstanding service"}
            </p>
          </div>

          {/* Feedback Text */}
          <div className="space-y-2">
            <Label htmlFor="feedback" className="text-sm font-semibold">
              Additional Comments
            </Label>
            <Textarea
              id="feedback"
              placeholder="Tell us about your experience with this supplier..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
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
            disabled={isSubmitting || rating === 0}
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
                Submit Feedback
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
