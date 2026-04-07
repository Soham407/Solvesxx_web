"use client";

import { useState, useRef, useCallback } from "react";
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
import { Camera, Upload, X, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploadDialogProps {
  serviceRequestId: string;
  jobId?: string;
  onUploadComplete?: () => void;
  children: React.ReactNode;
}

export function PhotoUploadDialog({ 
  serviceRequestId, 
  jobId, 
  onUploadComplete,
  children 
}: PhotoUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ before: 0, after: 0 });
  const { toast } = useToast();
  
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file", description: 'Only image files are allowed', variant: "destructive" });
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: 'Image must be under 5MB', variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleBeforeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(validateFile);
    if (files.length > 0) {
      setBeforePhotos(prev => [...prev, ...files]);
    }
  };

  const handleAfterFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(validateFile);
    if (files.length > 0) {
      setAfterPhotos(prev => [...prev, ...files]);
    }
  };

  const removeBeforePhoto = (index: number) => {
    setBeforePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeAfterPhoto = (index: number) => {
    setAfterPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File, prefix: string): Promise<string> => {
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${serviceRequestId}/${prefix}_${timestamp}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('service-evidence')
      .upload(fileName, file, { 
        cacheControl: '3600', 
        upsert: false 
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('service-evidence')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleUpload = async () => {
    if (beforePhotos.length === 0 && afterPhotos.length === 0) {
      toast({
        title: "No Photos Selected",
        description: "Please select at least one photo to upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Upload before photos
      const beforeUrls: string[] = [];
      for (let i = 0; i < beforePhotos.length; i++) {
        const url = await uploadFile(beforePhotos[i], 'before');
        beforeUrls.push(url);
        setUploadProgress(prev => ({ ...prev, before: ((i + 1) / beforePhotos.length) * 100 }));
      }

      // Upload after photos
      const afterUrls: string[] = [];
      for (let i = 0; i < afterPhotos.length; i++) {
        const url = await uploadFile(afterPhotos[i], 'after');
        afterUrls.push(url);
        setUploadProgress(prev => ({ ...prev, after: ((i + 1) / afterPhotos.length) * 100 }));
      }

      // Save to database (using job_photos table with correct schema)
      try {
        // First persist evidence at request scope.
        const requestEvidencePatch: Record<string, string> = {};
        if (beforeUrls.length > 0) {
          requestEvidencePatch.before_photo_url = beforeUrls[0];
        }
        if (afterUrls.length > 0) {
          requestEvidencePatch.after_photo_url = afterUrls[0];
        }

        if (Object.keys(requestEvidencePatch).length > 0) {
          await supabase
            .from("service_requests")
            .update(requestEvidencePatch)
            .eq("id", serviceRequestId);
        }

        // Then link photo rows only if a real job session exists.
        const { data: latestSession } = await supabase
          .from("job_sessions")
          .select("id")
          .eq("service_request_id", serviceRequestId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestSession?.id) {
          const allPhotos = [
            ...beforeUrls.map((url) => ({ job_session_id: latestSession.id, photo_url: url, photo_type: "before" })),
            ...afterUrls.map((url) => ({ job_session_id: latestSession.id, photo_url: url, photo_type: "after" })),
          ];

          if (allPhotos.length > 0) {
            await supabase.from("job_photos").insert(allPhotos as any);
          }
        }
      } catch (dbErr) {
        // Persistence best-effort: storage upload already succeeded.
        console.log("Photo metadata persistence warning:", dbErr);
      }

      toast({
        title: "Photos Uploaded Successfully",
        description: `${beforeUrls.length} before and ${afterUrls.length} after photos have been saved.`,
      });

      // Reset and close
      setBeforePhotos([]);
      setAfterPhotos([]);
      setIsOpen(false);
      onUploadComplete?.();

    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "Failed to upload photos. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress({ before: 0, after: 0 });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Upload Job Photos
          </DialogTitle>
          <DialogDescription>
            Upload before and after photos for {jobId ? `job #${jobId}` : "this service request"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 mt-4">
          {/* Before Photos Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-warning" />
              Before Photos
            </h4>
            
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => beforeInputRef.current?.click()}
            >
              <input
                ref={beforeInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleBeforeFileSelect}
              />
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-8 w-8" />
                <span className="text-xs">Click to upload before photos</span>
              </div>
            </div>

            {/* Before Photo Previews */}
            {beforePhotos.length > 0 && (
              <div className="space-y-2">
                {beforePhotos.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <div className="h-8 w-8 bg-warning/20 rounded flex items-center justify-center">
                      <Camera className="h-4 w-4 text-warning" />
                    </div>
                    <span className="text-xs truncate flex-1">{file.name}</span>
                    <button
                      onClick={() => removeBeforePhoto(index)}
                      className="p-1 hover:bg-destructive/10 rounded"
                      disabled={isUploading}
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isUploading && uploadProgress.before > 0 && (
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-warning transition-all duration-300"
                    style={{ width: `${uploadProgress.before}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">Uploading before photos...</span>
              </div>
            )}
          </div>

          {/* After Photos Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              After Photos
            </h4>
            
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => afterInputRef.current?.click()}
            >
              <input
                ref={afterInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAfterFileSelect}
              />
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-8 w-8" />
                <span className="text-xs">Click to upload after photos</span>
              </div>
            </div>

            {/* After Photo Previews */}
            {afterPhotos.length > 0 && (
              <div className="space-y-2">
                {afterPhotos.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <div className="h-8 w-8 bg-success/20 rounded flex items-center justify-center">
                      <Camera className="h-4 w-4 text-success" />
                    </div>
                    <span className="text-xs truncate flex-1">{file.name}</span>
                    <button
                      onClick={() => removeAfterPhoto(index)}
                      className="p-1 hover:bg-destructive/10 rounded"
                      disabled={isUploading}
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isUploading && uploadProgress.after > 0 && (
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success transition-all duration-300"
                    style={{ width: `${uploadProgress.after}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">Uploading after photos...</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={isUploading || (beforePhotos.length === 0 && afterPhotos.length === 0)}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Upload Photos
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
