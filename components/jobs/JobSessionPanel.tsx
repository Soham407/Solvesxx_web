"use client";

import { useState, useRef } from "react";
import {
  Play,
  CheckCircle,
  Camera,
  Loader2,
  Image as ImageIcon,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import type { ServiceRequestWithDetails } from "@/src/types/operations";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";


interface JobSessionPanelProps {
  serviceRequest: ServiceRequestWithDetails;
  technicianId?: string; // Optional if derived from auth context elsewhere
  onComplete?: () => void;
  onClose?: () => void;
}

export function JobSessionPanel({
  serviceRequest,
  technicianId,
  onComplete,
  onClose,
}: JobSessionPanelProps) {
  const { startTask, completeTask, refresh } = useServiceRequests();
  
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  
  // Preview
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  // Separate refs for each modal's file input to prevent cross-triggering
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modals close
  const resetState = () => {
    // Revoke blob URLs to prevent memory leaks
    if (beforePreview) URL.revokeObjectURL(beforePreview);
    if (afterPreview) URL.revokeObjectURL(afterPreview);
    setBeforePhoto(null);
    setAfterPhoto(null);
    setBeforePreview(null);
    setAfterPreview(null);
    setCompletionNotes("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB allowed.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (type === 'before') {
      setBeforePhoto(file);
      setBeforePreview(previewUrl);
    } else {
      setAfterPhoto(file);
      setAfterPreview(previewUrl);
    }
  };

  const uploadEvidence = async (file: File, prefix: string) => {
    const timestamp = Date.now();
    const fileName = `${serviceRequest.id}/${prefix}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    // Upload to 'service-evidence' bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('service-evidence')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('service-evidence')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleStartTask = async () => {
    if (!beforePhoto) {
      toast.error("Before photo is mandatory to prove start condition.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload Photo
      const photoUrl = await uploadEvidence(beforePhoto, 'start');
      
      // 2. Call RPC
      const result = await startTask(serviceRequest.id, photoUrl);
      
      if (result.success) {
        toast.success("Task started successfully.");
        setIsStartModalOpen(false);
        resetState();
        refresh(); // Refresh parent list
      } else {
        toast.error("Failed to start task: " + result.error);
      }
    } catch (err: any) {
      console.error("Start task error:", err);
      toast.error("Start failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!afterPhoto) {
      toast.error("After photo is mandatory to prove completion.");
      return;
    }

    if (!completionNotes || completionNotes.length < 5) {
      toast.error("Please add completion notes.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload Photo
      const photoUrl = await uploadEvidence(afterPhoto, 'complete');
      
      // 2. Call RPC
      const result = await completeTask(serviceRequest.id, photoUrl, completionNotes);
      
      if (result.success) {
        toast.success("Task completed successfully.");
        setIsCompleteModalOpen(false);
        resetState();
        if (onComplete) onComplete();
        refresh();
      } else {
        toast.error("Failed to complete task: " + result.error);
      }
    } catch (err: any) {
      console.error("Complete task error:", err);
      toast.error("Completion failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine UI state
  const isAssigned = serviceRequest.status === 'assigned';
  const isInProgress = serviceRequest.status === 'in_progress';
  const isCompleted = serviceRequest.status === 'completed';

  if (!isAssigned && !isInProgress && !isCompleted) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Task status: {serviceRequest.status}</p>
          <p className="text-xs">Must be assigned to start work.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-none shadow-premium bg-gradient-to-br from-card to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Job Execution Panel</span>
            {isInProgress && (
              <span className="flex items-center gap-2 text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded animate-pulse">
                <Clock className="h-3 w-3" /> IN PROGRESS
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Strict evidence enforcement active. Photos required for all state transitions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Start Actions */}
          {isAssigned && (
            <div className="p-4 border rounded-lg bg-background/50 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Play className="h-5 w-5 ml-0.5" />
                </div>
                <div>
                  <h4 className="font-bold">Ready to Start?</h4>
                  <p className="text-xs text-muted-foreground">Capture "Before" photo to begin.</p>
                </div>
              </div>
              <Button onClick={() => setIsStartModalOpen(true)} className="w-full gap-2 font-bold">
                <Camera className="h-4 w-4" /> Initialize Task
              </Button>
            </div>
          )}

          {/* In Progress Actions */}
          {isInProgress && (
            <div className="p-4 border rounded-lg bg-background/50 space-y-3 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold">Work in Progress</h4>
                  <p className="text-xs text-muted-foreground">Started at: {serviceRequest.started_at ? new Date(serviceRequest.started_at).toLocaleTimeString() : 'Unknown'}</p>
                </div>
              </div>
              
              {serviceRequest.before_photo_url && (
                <div className="relative h-32 w-full rounded-md overflow-hidden bg-muted group">
                   <img src={serviceRequest.before_photo_url} alt="Before Condition" className="h-full w-full object-cover" />
                   <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-center text-xs text-white font-bold">
                     Evidence: Before Condition
                   </div>
                </div>
              )}

              <Button onClick={() => setIsCompleteModalOpen(true)} className="w-full gap-2 font-bold bg-green-600 hover:bg-green-700" variant="default">
                <CheckCircle className="h-4 w-4" /> Mark Complete
              </Button>
            </div>
          )}

          {/* Completed State */}
          {isCompleted && (
            <div className="p-4 border rounded-lg bg-success/5 space-y-3 border-success/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-success">Task Completed</h4>
                  <p className="text-xs text-muted-foreground">Verified & Closed</p>
                </div>
              </div>
              
               <div className="grid grid-cols-2 gap-2">
                  {serviceRequest.before_photo_url && (
                    <div className="relative h-24 w-full rounded-md overflow-hidden bg-muted">
                      <img src={serviceRequest.before_photo_url} alt="Before" className="h-full w-full object-cover" />
                    </div>
                  )}
                  {serviceRequest.after_photo_url && (
                    <div className="relative h-24 w-full rounded-md overflow-hidden bg-muted">
                      <img src={serviceRequest.after_photo_url} alt="After" className="h-full w-full object-cover" />
                    </div>
                  )}
               </div>
               
               <p className="text-xs italic bg-background p-2 rounded border">"{serviceRequest.completion_notes}"</p>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Start Modal */}
      <Dialog open={isStartModalOpen} onOpenChange={(open) => { if (!isSubmitting) setIsStartModalOpen(open); if(!open) resetState(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Service Task</DialogTitle>
            <DialogDescription>
              Upload a photo of the issue BEFORE starting work. This is required for operational truth.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
             <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => beforeFileInputRef.current?.click()}>
                {beforePreview ? (
                  <div className="relative h-48 w-full mx-auto">
                    <img src={beforePreview} alt="Preview" className="h-full w-full object-contain rounded-md" />
                    <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={(e) => { e.stopPropagation(); setBeforePhoto(null); setBeforePreview(null); }}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Click to upload photo</span>
                  </div>
                )}
                <Input 
                  ref={beforeFileInputRef} 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, 'before')} 
                />
             </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleStartTask} disabled={!beforePhoto || isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Modal */}
      <Dialog open={isCompleteModalOpen} onOpenChange={(open) => { if (!isSubmitting) setIsCompleteModalOpen(open); if(!open) resetState(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Service Task</DialogTitle>
            <DialogDescription>
              Upload a photo of the completed work ("After" condition) and add notes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
             <Label>Evidence Photo (Mandatory)</Label>
             <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => afterFileInputRef.current?.click()}>
                {afterPreview ? (
                  <div className="relative h-48 w-full mx-auto">
                    <img src={afterPreview} alt="Preview" className="h-full w-full object-contain rounded-md" />
                    <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={(e) => { e.stopPropagation(); setAfterPhoto(null); setAfterPreview(null); }}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Click to upload result</span>
                  </div>
                )}
                <Input 
                  ref={afterFileInputRef} 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, 'after')} 
                />
             </div>

             <div className="space-y-2">
               <Label htmlFor="notes">Completion Notes</Label>
               <Textarea 
                 id="notes" 
                 placeholder="Describe work done, parts replaced, etc." 
                 value={completionNotes}
                 onChange={(e) => setCompletionNotes(e.target.value)}
               />
             </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCompleteTask} disabled={!afterPhoto || completionNotes.length < 5 || isSubmitting} className="gap-2 bg-green-600 hover:bg-green-700" variant="default">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Complete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
