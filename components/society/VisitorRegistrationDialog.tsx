"use client";

import { useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useVisitors, CreateVisitorDTO } from "@/hooks/useVisitors";
import { Camera, Upload, Loader2, Search, Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface VisitorRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VisitorRegistrationDialog({ 
  open, 
  onOpenChange,
  onSuccess 
}: VisitorRegistrationDialogProps) {
  const { addVisitor, uploadVisitorPhoto, searchFlats, checkFrequentVisitor } = useVisitors();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<CreateVisitorDTO>>({
    visitor_type: "guest",
    purpose: "Guest Visit",
  });
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [flatResults, setFlatResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFlat, setSelectedFlat] = useState<any>(null);
  const [frequentVisitor, setFrequentVisitor] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase
    setIsUploading(true);
    const result = await uploadVisitorPhoto(file);
    setIsUploading(false);

    if (result.success && result.url) {
      setFormData(prev => ({ ...prev, photo_url: result.url }));
    }
  };

  const handleSearchFlats = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const result = await searchFlats(searchQuery);
    setIsSearching(false);
    if (result.success) {
      setFlatResults(result.data || []);
    }
  };

  const handleSelectFlat = async (flat: any) => {
    setSelectedFlat(flat);
    setFormData(prev => ({ 
      ...prev, 
      flat_id: flat.id,
      resident_id: flat.residents?.find((r: any) => r.is_primary_contact)?.id || flat.residents?.[0]?.id 
    }));

    // Check for frequent visitor bypass (Phase 1B)
    if (formData.phone) {
      const freqResult = await checkFrequentVisitor(formData.phone, flat.id);
      if (freqResult.success && freqResult.data) {
        setFrequentVisitor(freqResult.data);
        setFormData(prev => ({
          ...prev,
          is_frequent_visitor: true,
          approval_required: false,
          bypass_reason: "Frequent Visitor Pre-approved"
        }));
      } else {
        setFrequentVisitor(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.visitor_name || !formData.photo_url || !formData.flat_id) {
      return;
    }

    setIsSubmitting(true);
    const result = await addVisitor(formData as CreateVisitorDTO);
    setIsSubmitting(false);

    if (result.success) {
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      visitor_type: "guest",
      purpose: "Guest Visit",
    });
    setPhotoPreview(null);
    setSearchQuery("");
    setFlatResults([]);
    setSelectedFlat(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-premium">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-black tracking-tight">Register Visitor</DialogTitle>
          <DialogDescription>
            Enter visitor details and capture evidence for entry.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {/* Photo Capture (Mandatory) */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-32 w-32 border-4 border-muted shadow-lg">
                    <AvatarImage src={photoPreview || undefined} className="object-cover" />
                    <AvatarFallback className="bg-muted">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="absolute bottom-0 right-0 rounded-full shadow-lg h-10 w-10 border-2 border-background"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="text-center">
                  <Label className={cn("text-xs font-bold uppercase tracking-wider", !formData.photo_url ? "text-critical" : "text-success")}>
                    {!formData.photo_url ? "* Mandatory Photo Capture" : "✓ Photo Captured"}
                  </Label>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  capture="user"
                  onChange={handlePhotoUpload} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="visitor_name">Visitor Full Name</Label>
                  <Input 
                    id="visitor_name" 
                    placeholder="Enter full name" 
                    value={formData.visitor_name || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, visitor_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visitor_type">Visitor Type</Label>
                  <Select 
                    value={formData.visitor_type} 
                    onValueChange={val => setFormData(prev => ({ ...prev, visitor_type: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guest">Guest</SelectItem>
                      <SelectItem value="vendor">Vendor/Delivery</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="service_staff">Service Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="10-digit mobile" 
                    value={formData.phone || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              
              <Button 
                className="w-full" 
                disabled={!formData.visitor_name || !formData.photo_url}
                onClick={() => setStep(2)}
              >
                Next: Select Destination
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <Label>Destination Flat</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search flat number..." 
                      className="pl-9"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearchFlats()}
                    />
                  </div>
                  <Button variant="secondary" onClick={handleSearchFlats} disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </div>

                <div className="max-h-[200px] overflow-y-auto border rounded-lg bg-muted/30 divide-y">
                  {flatResults.length === 0 && !isSearching && (
                    <div className="p-8 text-center text-xs text-muted-foreground italic">
                      Identify the flat the visitor is going to.
                    </div>
                  )}
                  {flatResults.map(flat => (
                    <button
                      key={flat.id}
                      type="button"
                      className={cn(
                        "w-full p-3 flex items-center justify-between text-left cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedFlat?.id === flat.id && "bg-primary/5"
                      )}
                      onClick={() => handleSelectFlat(flat)}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{flat.building?.building_name} - {flat.flat_number}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {flat.residents?.[0]?.full_name || "No resident entry"}
                        </span>
                      </div>
                      {selectedFlat?.id === flat.id && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </div>

                {frequentVisitor && (
                  <div className="p-3 bg-success/10 border border-success/20 rounded-lg animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-2 text-success mb-1">
                      <Check className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Fast Entry Eligible</span>
                    </div>
                    <p className="text-[10px] text-success/80 font-medium">
                      This visitor is a registered frequent visitor for this flat and has resident opt-in. No approval required.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Visit</Label>
                <Input 
                  id="purpose" 
                  placeholder="e.g. Swiggy delivery, Guest visit" 
                  value={formData.purpose || ""} 
                  onChange={e => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button 
                  className="flex-1 shadow-glow" 
                  disabled={!formData.flat_id || isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin fill-white" />
                  ) : frequentVisitor ? (
                    "Instant Check-in"
                  ) : (
                    "Verify & Send Alert"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 bg-muted/50 border-t flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            Step {step} of 2
          </span>
          <div className="flex gap-1">
            <div className={cn("h-1.5 w-6 rounded-full", step >= 1 ? "bg-primary" : "bg-muted-foreground/30")} />
            <div className={cn("h-1.5 w-6 rounded-full", step >= 2 ? "bg-primary" : "bg-muted-foreground/30")} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
