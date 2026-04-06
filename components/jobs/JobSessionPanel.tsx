"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  CheckCircle,
  Camera,
  Loader2,
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
import { Badge } from "@/components/ui/badge";
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
import { useJobSessions } from "@/hooks/useJobSessions";
import { usePestControlPPE, PPEChecklistData } from "@/hooks/usePestControlPPE";
import type { ServiceRequestWithDetails } from "@/src/types/operations";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface JobSessionPanelProps {
  serviceRequest: ServiceRequestWithDetails;
  technicianId?: string; // Optional if derived from auth context elsewhere
  onComplete?: () => void;
  onClose?: () => void;
}

const CHECKLIST_ITEMS = [
  { id: "gloves_worn", label: "Gloves worn" },
  { id: "mask_worn", label: "Mask/Respirator worn" },
  { id: "goggles_worn", label: "Safety goggles" },
  { id: "full_suit_worn", label: "Full body suit" },
  { id: "chemical_dilution_verified", label: "Chemical dilution verified" },
  { id: "resident_area_cleared", label: "Resident area cleared" },
];

export function JobSessionPanel({
  serviceRequest,
  technicianId,
  onComplete,
}: JobSessionPanelProps) {
  const { startTask, completeTask, refresh, getRequestById } = useServiceRequests();
  const { sessions } = useJobSessions(serviceRequest.id);
  const activeSession = sessions.find(s => s.status === 'started' || s.status === 'paused');
  const { ppeVerification, submitPPEChecklist } = usePestControlPPE(activeSession?.id, serviceRequest.id);
  const [requestState, setRequestState] = useState(serviceRequest);
  
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  
  // PPE State
  const [ppeFormData, setPpeFormData] = useState<PPEChecklistData>({
    gloves_worn: false,
    mask_worn: false,
    goggles_worn: false,
    full_suit_worn: false,
    chemical_dilution_verified: false,
    resident_area_cleared: false,
  });

  const isPpeVerified = ppeVerification?.all_items_checked === true;

  const serviceName = String(requestState.service_name || "").toLowerCase();
  const serviceCode = String((requestState as any).service_code || "");
  const isPestControl = serviceCode === "PST-CON" || serviceName.includes("pest") || serviceName.includes("pst-con");

  useEffect(() => {
    if (ppeVerification) {
      setPpeFormData({
        gloves_worn: ppeVerification.gloves_worn,
        mask_worn: ppeVerification.mask_worn,
        goggles_worn: ppeVerification.goggles_worn,
        full_suit_worn: ppeVerification.full_suit_worn,
        chemical_dilution_verified: ppeVerification.chemical_dilution_verified,
        resident_area_cleared: ppeVerification.resident_area_cleared,
      });
    }
  }, [ppeVerification]);
  
  // Preview
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  // Separate refs for each modal's file input to prevent cross-triggering
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRequestState(serviceRequest);
  }, [serviceRequest]);

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
    const fileName = `${requestState.id}/${prefix}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    // Upload to 'service-evidence' bucket
    const { error: uploadError } = await supabase.storage
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
      const result = await startTask(requestState.id, photoUrl);
      
      if (result.success) {
        const updatedRequest = await getRequestById(requestState.id);
        if (updatedRequest) {
          setRequestState(updatedRequest);
        }
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

  const handleTogglePPE = (id: keyof PPEChecklistData) => {
    if (isPpeVerified) return;
    setPpeFormData(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleVerifyPPE = async () => {
    if (!technicianId) {
      toast.error("Technician ID is required for PPE verification");
      return;
    }

    const allChecked = Object.values(ppeFormData).every(v => v === true);
    if (!allChecked) {
      toast.error("All PPE items must be verified");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitPPEChecklist(ppeFormData, technicianId);

      if (result.success) {
        toast.success("PPE Verification successful");
      } else {
        toast.error("Failed to verify PPE: " + result.error);
      }
    } catch (err: any) {
      toast.error("PPE Verification error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
    if (isPestControl && !isPpeVerified) {
      toast.error("PPE verification is required for pest control jobs.");
      return;
    }

    if (!afterPhoto) {
      toast.error("After photo is mandatory to prove completion.");
      return;
    }

    if (!completionNotes || completionNotes.trim().length < 10) {
      toast.error("Please add meaningful completion notes (min 10 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload Photo
      const photoUrl = await uploadEvidence(afterPhoto, 'complete');
      
      // 2. Call RPC
      const result = await completeTask(requestState.id, photoUrl, completionNotes.trim());
      
      if (result.success) {
        const updatedRequest = await getRequestById(requestState.id);
        if (updatedRequest) {
          setRequestState(updatedRequest);
        }
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
  const isAssigned = requestState.status === 'assigned';
  const isInProgress = requestState.status === 'in_progress';
  const isCompleted = requestState.status === 'completed';

  const allPpeChecked = Object.values(ppeFormData).every(v => v === true);

  if (!isAssigned && !isInProgress && !isCompleted) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Task status: {requestState.status}</p>
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
                  <p className="text-xs text-muted-foreground">Started at: {requestState.started_at ? new Date(requestState.started_at).toLocaleTimeString() : 'Unknown'}</p>
                </div>
              </div>
              
              {requestState.before_photo_url && (
                <div className="relative h-32 w-full rounded-md overflow-hidden bg-muted group">
                   <img src={requestState.before_photo_url} alt="Before Condition" className="h-full w-full object-cover" />
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
                  {requestState.before_photo_url && (
                    <div className="relative h-24 w-full rounded-md overflow-hidden bg-muted">
                      <img src={requestState.before_photo_url} alt="Before" className="h-full w-full object-cover" />
                    </div>
                  )}
                  {requestState.after_photo_url && (
                    <div className="relative h-24 w-full rounded-md overflow-hidden bg-muted">
                      <img src={requestState.after_photo_url} alt="After" className="h-full w-full object-cover" />
                    </div>
                  )}
               </div>
               
               <p className="text-xs italic bg-background p-2 rounded border">"{requestState.completion_notes}"</p>
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
             {isPestControl && (
               <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                 <div className="flex items-center justify-between">
                   <h4 className="font-bold text-sm">PPE Checklist</h4>
                   {isPpeVerified ? (
                     <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Verified</Badge>
                   ) : (
                     <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Required</Badge>
                   )}
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {CHECKLIST_ITEMS.map((item) => (
                     <div key={item.id} className="flex items-center space-x-2">
                       <Checkbox 
                         id={item.id} 
                         checked={ppeFormData[item.id as keyof PPEChecklistData]} 
                         onCheckedChange={() => handleTogglePPE(item.id as keyof PPEChecklistData)}
                         disabled={isPpeVerified || isSubmitting}
                       />
                       <Label 
                         htmlFor={item.id}
                         className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                       >
                         {item.label}
                       </Label>
                     </div>
                   ))}
                 </div>
                 
                 {!isPpeVerified && (
                   <Button 
                     size="sm" 
                     className="w-full mt-2" 
                     onClick={handleVerifyPPE}
                     disabled={isSubmitting || !allPpeChecked}
                   >
                     {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                     Verify PPE Completion
                   </Button>
                 )}
               </div>
             )}

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
            <Button onClick={handleCompleteTask} disabled={!afterPhoto || completionNotes.trim().length < 10 || isSubmitting || (isPestControl && !isPpeVerified)} className="gap-2 bg-green-600 hover:bg-green-700" variant="default">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Complete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
