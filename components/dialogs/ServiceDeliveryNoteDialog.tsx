"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Users, Loader2, Download, CheckCircle2 } from "lucide-react";
import { useServiceDeliveryNotes } from "@/hooks/useServiceDeliveryNotes";

const personnelSchema = z.object({
  name: z.string().min(2, "Name is required"),
  id_proof_type: z.string().min(1, "ID type is required"),
  id_proof_number: z.string().min(1, "ID number is required"),
  qualification: z.string().min(1, "Qualification required"),
  contact: z.string().min(10, "Valid contact required"),
});

const formSchema = z.object({
  delivery_date: z.string().min(1, "Delivery date required"),
  personnel: z.array(personnelSchema).min(1, "Add at least one person"),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceDeliveryNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poId: string;
  poNumber: string;
  onSuccess?: () => void;
}

export function ServiceDeliveryNoteDialog({
  open,
  onOpenChange,
  poId,
  poNumber,
  onSuccess,
}: ServiceDeliveryNoteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSDN, setCreatedSDN] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { createNote } = useServiceDeliveryNotes(poId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      delivery_date: new Date().toISOString().split("T")[0],
      personnel: [{ name: "", id_proof_type: "Aadhaar", id_proof_number: "", qualification: "", contact: "" }],
      remarks: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "personnel",
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const result = await createNote({
      po_id: poId,
      delivery_date: values.delivery_date,
      personnel_details: values.personnel,
      remarks: values.remarks,
    });
    setIsSubmitting(false);
    if (result.success) {
      setCreatedSDN(result.data);
      form.reset();
      onSuccess?.();
    }
  };

  const handleDownloadPDF = async () => {
    if (!createdSDN) return;
    setIsDownloading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Service Delivery Note", 20, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`SDN ID: ${createdSDN.id || "N/A"}`, 20, 34);
      doc.text(`PO Number: ${poNumber}`, 20, 42);
      doc.text(
        `Delivery Date: ${createdSDN.delivery_date || new Date().toISOString().split("T")[0]}`,
        20,
        50
      );
      doc.text(`Status: ${createdSDN.status || "pending"}`, 20, 58);
      if (createdSDN.remarks) {
        doc.text(`Remarks: ${createdSDN.remarks}`, 20, 66);
      }

      const personnel: any[] = createdSDN.personnel_details || [];
      if (personnel.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Personnel Deployed:", 20, 80);
        doc.setFont("helvetica", "normal");
        let y = 90;
        personnel.forEach((p: any, idx: number) => {
          doc.text(
            `${idx + 1}. ${p.name} — ${p.qualification} | ${p.id_proof_type}: ${p.id_proof_number} | ${p.contact}`,
            20,
            y
          );
          y += 8;
        });

        doc.setFont("helvetica", "bold");
        doc.text(`Total Headcount: ${personnel.length}`, 20, y + 4);
      }

      const fileName = `SDN-${(createdSDN.id || "draft").substring(0, 8).toUpperCase()}.pdf`;
      doc.save(fileName);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    setCreatedSDN(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Upload Delivery Note
          </DialogTitle>
          <p className="text-xs text-muted-foreground">PO: <span className="font-mono font-bold">{poNumber}</span></p>
        </DialogHeader>

        {/* Success State */}
        {createdSDN && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-success" />
            <div>
              <p className="font-bold text-base">Delivery Note Submitted</p>
              <p className="text-sm text-muted-foreground mt-1">
                SDN created successfully and is awaiting admin verification.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Close
              </Button>
              <Button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="gap-2"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download PDF
              </Button>
            </div>
          </div>
        )}

        {/* Form State */}
        {!createdSDN && <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-4 py-2">
            {/* Delivery Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Delivery Date</Label>
                <Input type="date" {...form.register("delivery_date")} />
                {form.formState.errors.delivery_date && (
                  <p className="text-xs text-destructive">{form.formState.errors.delivery_date.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Remarks</Label>
                <Input placeholder="Optional notes..." {...form.register("remarks")} />
              </div>
            </div>

            <Separator />

            {/* Personnel List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase">
                  Personnel Deployed
                  <Badge className="ml-2 bg-primary/10 text-primary border-primary/20 text-[10px]">
                    {fields.length} persons
                  </Badge>
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={() => append({ name: "", id_proof_type: "Aadhaar", id_proof_number: "", qualification: "", contact: "" })}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Person
                </Button>
              </div>

              <ScrollArea className="max-h-72">
                <div className="space-y-3 pr-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-3 rounded-xl border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Person #{index + 1}</span>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Input
                            placeholder="Full Name *"
                            {...form.register(`personnel.${index}.name`)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="Qualification *"
                            {...form.register(`personnel.${index}.qualification`)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="ID Type (Aadhaar / PAN)"
                            {...form.register(`personnel.${index}.id_proof_type`)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="ID Number *"
                            {...form.register(`personnel.${index}.id_proof_number`)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder="Contact Number *"
                            {...form.register(`personnel.${index}.contact`)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {form.formState.errors.personnel && (
                <p className="text-xs text-destructive">Please add at least one person</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Submit Delivery Note
            </Button>
          </DialogFooter>
        </form>}
      </DialogContent>
    </Dialog>
  );
}
