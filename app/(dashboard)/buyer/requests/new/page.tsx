"use client";

import { useBuyerRequests } from "@/hooks/useBuyerRequests";
import { useProducts } from "@/hooks/useProducts";
import { useSocieties } from "@/hooks/useSocieties";
import { useAssetCategories } from "@/hooks/useAssetCategories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Trash2, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export default function NewBuyerRequestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { createRequest } = useBuyerRequests();
  const { products, isLoading: isLoadingProducts } = useProducts();
  const { societies, isLoading: isLoadingSocieties } = useSocieties();
  
  // States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [items, setItems] = useState<{ product_id: string; quantity: number; notes: string }[]>([
    { product_id: "", quantity: 1, notes: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1, notes: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.some(item => !item.product_id || item.quantity <= 0)) {
      toast({
        title: "Validation Error",
        description: "Please select products and valid quantities for all items.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await createRequest({
        title,
        description,
        location_id: locationId,
        preferred_delivery_date: preferredDate,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes
        }))
      });

      if (result) {
        toast({
          title: "Request Submitted",
          description: "Your order request has been submitted successfully."
        });
        router.push("/buyer/requests");
      }
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/buyer/requests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Order Request</h1>
          <p className="text-muted-foreground">Submit a new request for goods or services.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>Basic information about your requirement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Summary / Title</Label>
              <Input 
                id="title" 
                placeholder="e.g., Monthly Pantry Supplies" 
                required 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="location">Delivery Site (Society)</Label>
                <Select value={locationId} onValueChange={setLocationId} required>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {societies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.society_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Preferred Delivery Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea 
                id="description" 
                placeholder="Provide additional context for your request..." 
                className="min-h-[100px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Requested Items</CardTitle>
              <CardDescription>Select the products and quantities needed.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
              <Plus className="h-3 w-3" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex flex-wrap gap-4 items-end p-4 border rounded-lg bg-muted/30">
                <div className="flex-1 min-w-[200px] space-y-2">
                  <Label>Product</Label>
                  <Select 
                    value={item.product_id} 
                    onValueChange={(val) => updateItem(index, "product_id", val)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-[100px] space-y-2">
                  <Label>Quantity</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    required 
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value))}
                  />
                </div>

                <div className="flex-1 min-w-[200px] space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input 
                    placeholder="Size, color, etc."
                    value={item.notes}
                    onChange={(e) => updateItem(index, "notes", e.target.value)}
                  />
                </div>

                {items.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-critical hover:text-critical"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/buyer/requests">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" className="gap-2" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : (
              <>
                <Send className="h-4 w-4" /> Submit Request
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
