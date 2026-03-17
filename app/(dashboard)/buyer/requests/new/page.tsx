"use client";

import { useBuyerRequests } from "@/hooks/useBuyerRequests";
import { useProducts } from "@/hooks/useProducts";
import { useSocieties } from "@/hooks/useSocieties";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Trash2, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

const CATEGORY_TITLE_MAP: Record<string, string> = {
  cleaning: "Cleaning Essentials Request",
  security_materials: "Security Panel Materials Request",
  pest_supplies: "Pest Control Supplies Request",
  eco_disposable: "Eco-Friendly Disposables Request",
  pantry: "Pantry & Beverages Request",
  stationery: "Stationery Supplies Request",
  security: "Security Services Request",
  housekeeping: "Housekeeping Services Request",
  ac: "AC Maintenance Request",
  pest_control: "Pest Control Services Request",
  printing: "Printing Services Request",
  gifting: "Corporate Gifting Request",
};

export default function NewBuyerRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { createRequest } = useBuyerRequests();
  const { products, isLoading: isLoadingProducts } = useProducts();
  const { societies } = useSocieties();

  const categorySlug = searchParams.get("category") || "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [items, setItems] = useState<{ product_id: string; quantity: number; notes: string }[]>([
    { product_id: "", quantity: 1, notes: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive unique product categories from loaded products
  const productCategories = useMemo(() => {
    const seen = new Set<string>();
    const cats: { id: string; name: string }[] = [];
    products.forEach((p) => {
      if (p.category_id && p.category?.category_name && !seen.has(p.category_id)) {
        seen.add(p.category_id);
        cats.push({ id: p.category_id, name: p.category.category_name });
      }
    });
    return cats.sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Auto-select category based on URL slug when products load
  useEffect(() => {
    if (!categorySlug || selectedCategoryId !== "all" || productCategories.length === 0) return;
    const slug = categorySlug.replace(/_/g, " ").toLowerCase();
    const match = productCategories.find(
      (c) =>
        c.name.toLowerCase().includes(slug) ||
        slug.includes(c.name.toLowerCase().split(" ")[0])
    );
    if (match) setSelectedCategoryId(match.id);
  }, [categorySlug, productCategories]);

  // Auto-fill title from URL category param
  useEffect(() => {
    if (categorySlug && !title) {
      const preset = CATEGORY_TITLE_MAP[categorySlug];
      if (preset) setTitle(preset);
    }
  }, [categorySlug]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId || selectedCategoryId === "all") return products;
    return products.filter((p) => p.category_id === selectedCategoryId);
  }, [products, selectedCategoryId]);

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

    if (items.some((item) => !item.product_id || item.quantity <= 0)) {
      toast({
        title: "Validation Error",
        description: "Please select products and valid quantities for all items.",
        variant: "destructive",
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
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes,
        })),
      });

      if (result) {
        toast({
          title: "Request Submitted",
          description: "Your order request has been submitted successfully.",
        });
        router.push("/buyer/requests");
      }
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message,
        variant: "destructive",
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
        {categorySlug && (
          <Badge variant="secondary" className="ml-auto capitalize">
            <Package className="h-3 w-3 mr-1" />
            {categorySlug.replace(/_/g, " ")}
          </Badge>
        )}
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
                      <SelectItem key={s.id} value={s.id}>
                        {s.society_name}
                      </SelectItem>
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
            <div className="flex items-center gap-2">
              {productCategories.length > 0 && (
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {productCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex flex-wrap gap-4 items-end p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex-1 min-w-[200px] space-y-2">
                  <Label>Product</Label>
                  <Select
                    value={item.product_id}
                    onValueChange={(val) => updateItem(index, "product_id", val)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingProducts
                            ? "Loading products..."
                            : filteredProducts.length === 0
                            ? "No products in this category"
                            : "Select product"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.product_name}
                          {p.category?.category_name && selectedCategoryId === "all" && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              ({p.category.category_name})
                            </span>
                          )}
                        </SelectItem>
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
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="gap-2" disabled={isSubmitting}>
            {isSubmitting ? (
              "Submitting..."
            ) : (
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
