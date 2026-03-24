"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, User, Phone, Car, MapPin, Loader2, AlertCircle } from "lucide-react";
import { supabase as supabaseTyped } from "@/src/lib/supabaseClient";
const supabase = supabaseTyped as any;
import { MAIN_GATE_CODE } from "@/src/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface AddVisitorFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddVisitorForm({ onSuccess, onCancel }: AddVisitorFormProps) {
  const { toast } = useToast();
  const { userId } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    visitor_name: "",
    phone: "",
    vehicle_number: "",
    visitor_type: "guest",
    flat_id: "",
  });

  // Validate phone number
  const isValidPhone = (phone: string): boolean => {
    if (!phone) return false; // Required field
    // Accepts formats: +91 9876543210, 9876543210, +1-234-567-8900, etc.
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,3}[)]?[-\s.]?[0-9]{3,4}[-\s.]?[0-9]{3,6}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handlePhoneChange = (value: string) => {
    setFormData({ ...formData, phone: value });
    if (value && !isValidPhone(value)) {
      setPhoneError("Please enter a valid phone number");
    } else {
      setPhoneError(null);
    }
  };

  const [flats, setFlats] = useState<Array<{ id: string; flat_number: string; building_name: string }>>([]);

  // Load flats on component mount
  useEffect(() => {
    loadFlats();
  }, []);

  // Cleanup MediaStream on unmount or when camera is deactivated
  useEffect(() => {
    return () => {
      // Cleanup function runs on unmount
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
    };
  }, []);

  async function loadFlats() {
    try {
      const { data, error } = await supabase
        .from("flats")
        .select(`
          id,
          flat_number,
          buildings (
            building_name
          )
        `)
        .eq("is_active", true)
        .order("flat_number");

      if (error) throw error;

      const formattedFlats = data?.map((flat: any) => ({
        id: flat.id,
        flat_number: flat.flat_number,
        building_name: flat.buildings?.building_name || "Unknown",
      })) || [];

      setFlats(formattedFlats);
    } catch (error) {
      console.error("Error loading flats:", error);
      toast({
        title: "Error",
        description: "Failed to load flats. Please refresh the page.",
        variant: "destructive",
      });
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setImageSrc(imageData);

    // Stop camera
    const stream = video.srcObject as MediaStream;
    stream?.getTracks().forEach((track) => track.stop());
    setIsCameraActive(false);
  }

  function retakePhoto() {
    setImageSrc(null);
    startCamera();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate phone before submit
    if (!isValidPhone(formData.phone)) {
      setPhoneError("Please enter a valid phone number");
      return;
    }
    
    // Validate flat selection
    if (!formData.flat_id) {
      toast({
        title: "Validation Error",
        description: "Please select a flat for the visitor",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Step 1: Resolve Gate ID
      const { data: gateData, error: gateError } = await supabase
        .from("company_locations")
        .select("id")
        .eq("location_code", MAIN_GATE_CODE)
        .single();

      if (gateError || !gateData) {
        throw new Error("Failed to find the main gate location. Please contact admin.");
      }

      const entryLocationId = gateData.id;

      // Step 2: Upload Photo (if present)
      let photoUrl: string | null = null;

      if (imageSrc) {
        try {
          // Resize image to max 640x480 before upload
          const resizedDataUrl = await new Promise<string>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const ratio = Math.min(640 / img.width, 480 / img.height, 1);
              const canvas = document.createElement("canvas");
              canvas.width = Math.round(img.width * ratio);
              canvas.height = Math.round(img.height * ratio);
              const ctx = canvas.getContext("2d")!;
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL("image/jpeg", 0.8));
            };
            img.src = imageSrc;
          });

          // Convert base64 to Blob
          const base64Response = await fetch(resizedDataUrl);
          const blob = await base64Response.blob();

          if (blob.size > 2 * 1024 * 1024) {
            throw new Error("Photo is too large (max 2MB). Please retake in better lighting.");
          }

          // Generate unique filename
          const fileName = `visitor_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("visitor-photos")
            .upload(fileName, blob, {
              contentType: "image/jpeg",
              cacheControl: "3600",
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("visitor-photos")
            .getPublicUrl(fileName);

          photoUrl = urlData.publicUrl;
        } catch (photoError) {
          console.error("Photo upload error:", photoError);
          toast({
            title: "Warning",
            description: "Photo upload failed, but continuing with visitor entry.",
            variant: "default",
          });
        }
      }

      // Step 3: Get the guard's employee ID from their user ID
      let guardEmployeeId: string | null = null;
      
      if (userId) {
        const { data: employeeData } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", userId)
          .single();
        
        guardEmployeeId = employeeData?.id || null;
      }

      // Step 4: Insert Visitor
      const { data: visitorData, error: visitorError } = await supabase
        .from("visitors")
        .insert({
          visitor_name: formData.visitor_name,
          phone: formData.phone,
          vehicle_number: formData.vehicle_number || null,
          visitor_type: formData.visitor_type,
          flat_id: formData.flat_id,
          entry_location_id: entryLocationId,
          photo_url: photoUrl,
          entry_guard_id: guardEmployeeId, // Use actual guard ID or null
          entry_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (visitorError) throw visitorError;

      // Success!
      toast({
        title: "Success",
        description: `Visitor ${formData.visitor_name} checked in successfully!`,
      });

      // Reset form
      setFormData({
        visitor_name: "",
        phone: "",
        vehicle_number: "",
        visitor_type: "guest",
        flat_id: "",
      });
      setImageSrc(null);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error during visitor check-in:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check in visitor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Camera Section */}
      <div className="space-y-4">
        <Label htmlFor="photo">Visitor Photo</Label>
        <div className="flex flex-col items-center gap-4">
          {!imageSrc && !isCameraActive && (
            <Button
              type="button"
              variant="outline"
              onClick={startCamera}
              className="w-full gap-2"
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </Button>
          )}

          {isCameraActive && (
            <div className="space-y-2 w-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Capture
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const stream = videoRef.current?.srcObject as MediaStream;
                    stream?.getTracks().forEach((track) => track.stop());
                    setIsCameraActive(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {imageSrc && (
            <div className="space-y-2 w-full">
              <img
                src={imageSrc}
                alt="Captured visitor"
                className="w-full rounded-lg border"
              />
              <Button
                type="button"
                variant="outline"
                onClick={retakePhoto}
                className="w-full gap-2"
              >
                <Camera className="h-4 w-4" />
                Retake Photo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Visitor Name */}
      <div className="space-y-2">
        <Label htmlFor="visitor_name">Visitor Name *</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="visitor_name"
            required
            placeholder="Enter visitor name"
            className="pl-9"
            value={formData.visitor_name}
            onChange={(e) =>
              setFormData({ ...formData, visitor_name: e.target.value })
            }
          />
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <div className="relative">
          <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${phoneError ? 'text-destructive' : 'text-muted-foreground'}`} />
          <Input
            id="phone"
            required
            type="tel"
            placeholder="+91 98765 43210"
            className={`pl-9 ${phoneError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            value={formData.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            aria-invalid={!!phoneError}
            aria-describedby={phoneError ? "phone-error" : undefined}
          />
        </div>
        {phoneError && (
          <p id="phone-error" className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {phoneError}
          </p>
        )}
      </div>

      {/* Vehicle Number */}
      <div className="space-y-2">
        <Label htmlFor="vehicle_number">Vehicle Number</Label>
        <div className="relative">
          <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="vehicle_number"
            placeholder="MH-12-AB-1234 (Optional)"
            className="pl-9"
            value={formData.vehicle_number}
            onChange={(e) =>
              setFormData({ ...formData, vehicle_number: e.target.value })
            }
          />
        </div>
      </div>

      {/* Visitor Type */}
      <div className="space-y-2">
        <Label htmlFor="visitor_type">Visitor Type *</Label>
        <Select
          value={formData.visitor_type}
          onValueChange={(value) =>
            setFormData({ ...formData, visitor_type: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select visitor type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="guest">Guest</SelectItem>
            <SelectItem value="vendor">Vendor</SelectItem>
            <SelectItem value="contractor">Contractor</SelectItem>
            <SelectItem value="service_staff">Service Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Flat Selection */}
      <div className="space-y-2">
        <Label htmlFor="flat_id">Visiting Flat *</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Select
            value={formData.flat_id}
            onValueChange={(value) =>
              setFormData({ ...formData, flat_id: value })
            }
            required
          >
            <SelectTrigger className="pl-9">
              <SelectValue placeholder="Select flat" />
            </SelectTrigger>
            <SelectContent>
              {flats.map((flat) => (
                <SelectItem key={flat.id} value={flat.id}>
                  {flat.building_name} - {flat.flat_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Checking In..." : "Check In Visitor"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
