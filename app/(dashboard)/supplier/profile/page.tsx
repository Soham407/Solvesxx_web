"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, UserRound } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useSupplierPortal } from "@/hooks/useSupplierPortal";

interface SupplierProfileFormState {
  supplier_name: string;
  contact_person: string;
  phone: string;
  alternate_phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gst_number: string;
  pan_number: string;
  bank_name: string;
  bank_account_number: string;
  ifsc_code: string;
  payment_terms: string;
  credit_limit: string;
  rates: string;
  availability: string;
}

const EMPTY_FORM: SupplierProfileFormState = {
  supplier_name: "",
  contact_person: "",
  phone: "",
  alternate_phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gst_number: "",
  pan_number: "",
  bank_name: "",
  bank_account_number: "",
  ifsc_code: "",
  payment_terms: "30",
  credit_limit: "0",
  rates: "",
  availability: "",
};

export default function SupplierProfilePage() {
  const { supplierProfile, updateSupplierProfile, isLoading } = useSupplierPortal();
  const { toast } = useToast();
  const [form, setForm] = useState<SupplierProfileFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supplierProfile) return;

    setForm({
      supplier_name: supplierProfile.supplier_name || "",
      contact_person: supplierProfile.contact_person || "",
      phone: supplierProfile.phone || "",
      alternate_phone: supplierProfile.alternate_phone || "",
      email: supplierProfile.email || "",
      address: supplierProfile.address || "",
      city: supplierProfile.city || "",
      state: supplierProfile.state || "",
      pincode: supplierProfile.pincode || "",
      gst_number: supplierProfile.gst_number || "",
      pan_number: supplierProfile.pan_number || "",
      bank_name: supplierProfile.bank_name || "",
      bank_account_number: supplierProfile.bank_account_number || "",
      ifsc_code: supplierProfile.ifsc_code || "",
      payment_terms: String(supplierProfile.payment_terms ?? 30),
      credit_limit: String(supplierProfile.credit_limit ?? 0),
      rates: supplierProfile.rates || "",
      availability: supplierProfile.availability || "",
    });
  }, [supplierProfile]);

  const setField = (field: keyof SupplierProfileFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await updateSupplierProfile({
      supplier_name: form.supplier_name,
      contact_person: form.contact_person || null,
      phone: form.phone || null,
      alternate_phone: form.alternate_phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      pincode: form.pincode || null,
      gst_number: form.gst_number || null,
      pan_number: form.pan_number || null,
      bank_name: form.bank_name || null,
      bank_account_number: form.bank_account_number || null,
      ifsc_code: form.ifsc_code || null,
      payment_terms: Number(form.payment_terms || 0),
      credit_limit: Number(form.credit_limit || 0),
      rates: form.rates || null,
      availability: form.availability || null,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Profile Updated",
        description: "Your supplier profile, rates, and availability have been saved.",
      });
      return;
    }

    toast({
      title: "Update Failed",
      description: result.error || "Supplier profile could not be updated.",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="My Profile"
        description="Update the supplier details, commercial terms, and availability shown for your account."
      />

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <UserRound className="h-4 w-4 text-primary" />
              Supplier Details
            </CardTitle>
            <CardDescription className="text-xs">
              These fields are scoped to your linked supplier record.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplier_name">Supplier Name</Label>
              <Input
                id="supplier_name"
                value={form.supplier_name}
                onChange={(event) => setField("supplier_name", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={form.contact_person}
                onChange={(event) => setField("contact_person", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alternate_phone">Alternate Phone</Label>
              <Input
                id="alternate_phone"
                value={form.alternate_phone}
                onChange={(event) => setField("alternate_phone", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst_number">GST Number</Label>
              <Input
                id="gst_number"
                value={form.gst_number}
                onChange={(event) => setField("gst_number", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pan_number">PAN Number</Label>
              <Input
                id="pan_number"
                value={form.pan_number}
                onChange={(event) => setField("pan_number", event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                rows={3}
                value={form.address}
                onChange={(event) => setField("address", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(event) => setField("city", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={(event) => setField("state", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={form.pincode}
                onChange={(event) => setField("pincode", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Commercial Terms</CardTitle>
            <CardDescription className="text-xs">
              Supplier autonomy fields added for direct rate and availability maintenance.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Payment Terms (days)</Label>
              <Input
                id="payment_terms"
                type="number"
                min={0}
                value={form.payment_terms}
                onChange={(event) => setField("payment_terms", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit_limit">Credit Limit</Label>
              <Input
                id="credit_limit"
                type="number"
                min={0}
                value={form.credit_limit}
                onChange={(event) => setField("credit_limit", event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="rates">Rates</Label>
              <Textarea
                id="rates"
                rows={4}
                placeholder="List your current service/material rates or commercial notes."
                value={form.rates}
                onChange={(event) => setField("rates", event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="availability">Availability</Label>
              <Textarea
                id="availability"
                rows={4}
                placeholder="Describe deployment windows, lead times, or supply availability."
                value={form.availability}
                onChange={(event) => setField("availability", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Banking Details</CardTitle>
            <CardDescription className="text-xs">
              These values are used by accounts when reconciling approved supplier bills.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={form.bank_name}
                onChange={(event) => setField("bank_name", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account_number">Account Number</Label>
              <Input
                id="bank_account_number"
                value={form.bank_account_number}
                onChange={(event) => setField("bank_account_number", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifsc_code">IFSC Code</Label>
              <Input
                id="ifsc_code"
                value={form.ifsc_code}
                onChange={(event) => setField("ifsc_code", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="gap-2" disabled={isLoading || isSubmitting || !supplierProfile}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
