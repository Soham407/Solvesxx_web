"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shield,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  MapPin,
  PhoneCall,
  Clock,
  Users,
  LogIn,
  LogOut,
  Loader2,
  AlertTriangle,
  Navigation,
  RefreshCw,
  UserCheck,
  Phone,
  Building,
  Car,
  Camera,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAttendance } from "@/hooks/useAttendance";
import { usePanicAlert } from "@/hooks/usePanicAlert";
import { useGuardVisitors } from "@/hooks/useGuardVisitors";
import { useGuardChecklist, useGuardShift } from "@/hooks/useGuardChecklist";
import { useEmployeeProfile } from "@/hooks/useEmployeeProfile";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/src/lib/supabaseClient";
import { useEmergencyContacts } from "@/hooks/useEmergencyContacts";
import { useInactivityMonitor } from "@/hooks/useInactivityMonitor";



// Expected Visitors Section Component
interface ExpectedVisitorsSectionProps {
  gateLocation?: {
    id: string;
    latitude: number;
    longitude: number;
    geo_fence_radius: number;
    location_name: string;
  } | null;
}

function ExpectedVisitorsSection({ gateLocation }: ExpectedVisitorsSectionProps) {
  const { toast } = useToast();
  const {
    expectedVisitors,
    isLoading,
    isCheckingIn,
    checkInVisitor,
    refresh,
  } = useGuardVisitors();

  // Handle visitor check-in
  const handleCheckIn = async (visitorId: string, visitorName: string) => {
    const result = await checkInVisitor(visitorId, undefined, gateLocation?.id);
    
    if (result.success) {
      toast({
        title: "Visitor Checked In",
        description: `${visitorName} has been checked in successfully.`,
      });
    } else {
      toast({
        title: "Check-In Failed",
        description: result.error || "Could not check in visitor.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-2">Loading expected visitors...</p>
        </CardContent>
      </Card>
    );
  }

  if (expectedVisitors.length === 0) {
    return (
      <Card className="border-none shadow-card ring-1 ring-border bg-muted/20">
        <CardContent className="p-6 text-center">
          <UserCheck className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No Expected Visitors</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Pre-approved visitors will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-card ring-1 ring-border overflow-hidden">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-success/5 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-success" />
            Expected Visitors
          </CardTitle>
          <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
            {expectedVisitors.length} PRE-APPROVED
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y max-h-[300px] overflow-y-auto">
          {expectedVisitors.map((visitor) => (
            <div
              key={visitor.id}
              className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
            >
              {/* Avatar */}
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-success">
                  {visitor.visitor_name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Visitor Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm truncate">{visitor.visitor_name}</p>
                  <Badge
                    variant="outline"
                    className="text-[8px] font-bold uppercase bg-success/10 text-success border-success/20"
                  >
                    PRE-APPROVED
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {visitor.flat && (
                    <span className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {visitor.flat.building?.building_name} - {visitor.flat.flat_number}
                    </span>
                  )}
                  {visitor.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {visitor.phone}
                    </span>
                  )}
                  {visitor.vehicle_number && (
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {visitor.vehicle_number}
                    </span>
                  )}
                </div>
                {visitor.purpose && (
                  <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">
                    Purpose: {visitor.purpose}
                  </p>
                )}
              </div>

              {/* Check-In Button */}
              <Button
                size="sm"
                className="shrink-0 bg-success hover:bg-success/90 gap-1 h-8 text-xs"
                disabled={isCheckingIn === visitor.id}
                onClick={() => handleCheckIn(visitor.id, visitor.visitor_name)}
              >
                {isCheckingIn === visitor.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <LogIn className="h-3 w-3" />
                )}
                Check In
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


export function GuardDashboard() {
  const { userId, isLoading: isAuthLoading } = useAuth();
  
  // Get authenticated employee profile
  const {
    employeeId,
    guardId,
    guardCode,
    fullName,
    isLoading: isProfileLoading,
    error: profileError
  } = useEmployeeProfile();

  // Show loading while auth/profile is being fetched
  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!employeeId) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Authentication Required</h2>
        <p className="text-sm text-muted-foreground text-center">
          {profileError || "Please log in to access the Guard Dashboard."}
        </p>
        <a href="/login" className="text-sm text-primary hover:underline font-medium">
          Go to Login →
        </a>
      </div>
    );
  }

  return (
    <GuardDashboardContent 
      employeeId={employeeId} 
      guardId={guardId}
      fullName={fullName} 
      guardCode={guardCode} 
    />
  );
}

interface GuardDashboardContentProps {
  employeeId: string;
  guardId: string | null;
  fullName: string | null;
  guardCode: string | null;
}

function GuardDashboardContent({ employeeId, guardId, fullName, guardCode }: GuardDashboardContentProps) {
  const { toast } = useToast();
  
  const {
    isWithinRange,
    distance,
    isLoading,
    error,
    gateLocation,
    currentPosition,
    isClockedIn,
    todayAttendance,
    clockIn,
    clockOut,
    autoClockOut,
    refresh,
  } = useAttendance(employeeId, guardId);

  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [showSelfieDialog, setShowSelfieDialog] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);
  const [visitorStats, setVisitorStats] = useState({
    visitorsToday: 0,
    pendingCheckouts: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [supervisorPhone, setSupervisorPhone] = useState<string | null>(null);

  // Panic Alert Hook
  const {
    isTriggering: isPanicTriggering,
    isHolding: isPanicHolding,
    holdProgress: panicHoldProgress,
    triggerPanic,
    startHold: startPanicHold,
    endHold: endPanicHold,
    cancelHold: cancelPanicHold,
  } = usePanicAlert();

  // Stability refs for useEffect — prevent stale closures in timeouts
  const toastRef = useRef(toast);
  const triggerPanicRef = useRef(triggerPanic);
  const autoClockOutRef = useRef(autoClockOut);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    triggerPanicRef.current = triggerPanic;
  }, [triggerPanic]);

  useEffect(() => {
    autoClockOutRef.current = autoClockOut;
  }, [autoClockOut]);

  // Sidebar/Checklist Visibility
  const [showAllChecklist, setShowAllChecklist] = useState(false);

  // Shift and Checklist Hooks
  const shiftInfo = useGuardShift(employeeId);
  const {
    items: checklistItems,
    totalItems: checklistTotal,
    completedItems: checklistCompleted,
    isLoading: isChecklistLoading,
    completeItem: completeChecklistItem,
    addEvidencePhoto: recordChecklistPhoto,
  } = useGuardChecklist(employeeId);

  // Emergency Contacts Hook
  const {
    contacts: emergencyContacts,
    isLoading: isLoadingEmergencyContacts,
  } = useEmergencyContacts();

  // Inactivity Monitoring (Anti-Sleeping)
  useInactivityMonitor(employeeId, isClockedIn, currentPosition);

  // Handle panic button hold release
  const handlePanicRelease = async () => {
    const wasHeldLongEnough = endPanicHold();
    if (wasHeldLongEnough) {
      // Use guard's real-time position if available, fallback to gate location
      const currentLat = currentPosition?.latitude ?? gateLocation?.latitude;
      const currentLng = currentPosition?.longitude ?? gateLocation?.longitude;

      // Note: triggerPanic now uses server-side auth (auth.uid())
      // No need to pass employeeId - it's derived from authenticated session
      const result = await triggerPanic({
        latitude: currentLat,
        longitude: currentLng,
        locationId: gateLocation?.id,
        alertType: "panic",
      });

      if (result.success) {
        toast({
          title: "🚨 Emergency Alert Sent!",
          description: "Security supervisor has been notified. Help is on the way.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Alert Failed",
          description: result.error || "Could not send emergency alert. Try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Geo-fence Monitoring Logic
  const outOfRangeStartTimeRef = useRef<number | null>(null);
  const latestRefs = useRef({ currentPosition, gateLocation, distance });

  // Update latest refs to avoid stale closures in timeouts
  useEffect(() => {
    latestRefs.current = { currentPosition, gateLocation, distance };
  }, [currentPosition, gateLocation, distance]);

  useEffect(() => {
    if (!isClockedIn || isWithinRange) {
      outOfRangeStartTimeRef.current = null;
      return;
    }

    // Guard is clocked in and OUT OF RANGE
    if (!outOfRangeStartTimeRef.current) {
      outOfRangeStartTimeRef.current = Date.now();
    }

    const warningTimeout = setTimeout(() => {
      toastRef.current({
        title: "⚠️ Warning: Return to Zone",
        description: "You are outside your assigned geo-fence area. Help has NOT been called yet, but your location is being tracked.",
        variant: "destructive",
      });
    }, 2 * 60 * 1000); // 2 minutes

    const breachTimeout = setTimeout(async () => {
      const { currentPosition: pos, gateLocation: gate, distance: dist } = latestRefs.current;
      
      try {
        const result = await triggerPanicRef.current({
          alertType: "geo_fence_breach",
          description: `Persistent geo-fence breach. Current distance: ${dist}m.`,
          locationId: gate?.id,
          latitude: pos?.latitude,
          longitude: pos?.longitude,
        });

        if (result.success) {
          toastRef.current({
            title: "🚨 Geo-fence Breach Alert Sent!",
            description: "A persistent breach has been reported to the supervisor.",
            variant: "destructive",
          });

          // Auto Punch-Out for persistent breach (M8 FIX: use ref to avoid stale closure)
          await autoClockOutRef.current("Persistent geo-fence breach (5+ minutes)");
          toastRef.current({
            title: "Shift Auto-Terminated",
            description: "You have been automatically clocked out due to geo-fence breach.",
            variant: "destructive",
          });
        } else {
          toastRef.current({
            title: "🚨 Breach Alert Failed",
            description: result.error || "Could not notify supervisor of breach.",
            variant: "destructive",
          });
        }
      } catch (err: unknown) {
        toastRef.current({
          title: "🚨 Alert Error",
          description: "System error while sending breach alert.",
          variant: "destructive",
        });
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearTimeout(warningTimeout);
      clearTimeout(breachTimeout);
    };
  }, [isClockedIn, isWithinRange]);

  // Fetch visitor statistics
  useEffect(() => {
    async function fetchVisitorStats() {
      try {
        // Compute local midnight and convert to UTC ISO string to avoid shifting issues
        const today = new Date();
        const localMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const todayISO = localMidnight.toISOString();

        // Build base query - optionally filter by guard's assigned location
        let todayQuery = supabase
          .from("visitors")
          .select("*", { count: "exact", head: true })
          .gte("entry_time", todayISO);
        
        let pendingQuery = supabase
          .from("visitors")
          .select("*", { count: "exact", head: true })
          .gte("entry_time", todayISO)
          .is("exit_time", null);

        // If guard has an assigned gate location, filter to show only that gate's visitors
        if (gateLocation?.id) {
          todayQuery = todayQuery.eq("entry_location_id", gateLocation.id);
          pendingQuery = pendingQuery.eq("entry_location_id", gateLocation.id);
        }

        const { count: visitorsToday, error: todayError } = await todayQuery;
        if (todayError) throw todayError;

        const { count: pendingCheckouts, error: pendingError } = await pendingQuery;
        if (pendingError) throw pendingError;

        setVisitorStats({
          visitorsToday: visitorsToday || 0,
          pendingCheckouts: pendingCheckouts || 0,
        });
      } catch (err: unknown) {
        console.error("Error fetching visitor stats:", err instanceof Error ? err.message : err);
      } finally {
        setIsLoadingStats(false);
      }
    }

    fetchVisitorStats();

    // Fetch supervisor info
    async function fetchSupervisorInfo() {
      try {
        // Query users table and join with roles to find a security supervisor
        const { data, error } = await supabase
          .from("users")
          .select("phone, roles!inner(role_name)")
          .eq("roles.role_name", "security_supervisor")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        
        if (error) throw error;
        if (data?.phone) {
          setSupervisorPhone(data.phone);
        }
      } catch (err: unknown) {
        console.error("Error fetching supervisor phone:", err instanceof Error ? err.message : err);
      }
    }
    fetchSupervisorInfo();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchVisitorStats, 30000);
    return () => clearInterval(interval);
  }, [gateLocation?.id]);

  // Handle Checklist Evidence Upload
  const handleEvidenceUpload = async (itemId: string, file: File | undefined) => {
    if (!file) return;

    // Config: Reject files > 10MB
    const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

    try {
      // 1. File-size guard
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max limit is 10MB.`);
      }

      // 2. Safe extension extraction
      let fileExt = "bin"; // Default fallback
      if (file.type) {
        // Try extracting from MIME type first
        const mimeParts = file.type.split('/');
        if (mimeParts.length > 1) {
          const ext = mimeParts[1].toLowerCase();
          if (ALLOWED_EXTENSIONS.includes(ext)) {
            fileExt = ext;
          }
        }
      }
      
      // Fallback to name-based extraction only if MIME was inconclusive
      if (fileExt === "bin" && file.name) {
        const nameExt = file.name.split('.').pop()?.toLowerCase();
        if (nameExt && ALLOWED_EXTENSIONS.includes(nameExt)) {
          fileExt = nameExt;
        }
      }

      // Explicitly reject if type is still unknown or unsupported
      if (fileExt === "bin") {
        toast({
          title: "Unsupported File Type",
          description: `Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      toast({ title: "Uploading Evidence...", description: "Please wait.", duration: 2000 });
      
      const fileName = `${itemId}-${Date.now()}.${fileExt}`;
      const filePath = `tasks/${fileName}`;

      // 3. Upload to storage (supabase.storage.upload)
      const { error: uploadError } = await supabase.storage
        .from('checklist-evidence')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      try {
        // 4. Update task record (recordChecklistPhoto)
        const result = await recordChecklistPhoto(itemId, filePath);

        if (result.success) {
          toast({ 
            title: "Photo Added", 
            description: "Evidence has been attached to this task.",
          });
        } else {
          throw new Error(result.error);
        }
      } catch (recordError: any) {
        // 5. Cleanup orphaned blobs if DB update fails
        console.error("Database update failed, cleaning up uploaded file:", recordError);
        const { error: deleteError } = await supabase.storage
          .from('checklist-evidence')
          .remove([filePath]);
        
        if (deleteError) {
          console.error("Manual cleanup of orphaned file failed:", deleteError);
        }
        
        throw recordError; // Rethrow to show original error message
      }
    } catch (err: any) {
      console.error("Evidence upload failed:", err);
      toast({ 
        title: "Upload Failed", 
        description: err.message || "Could not upload photo.",
        variant: "destructive"
      });
    }
  };

  // Handle Clock In (Triggered after selfie)
  const handleClockIn = async (selfieUrl: string) => {
    setIsClockingIn(true);
    const result = await clockIn(selfieUrl);
    setIsClockingIn(false);

    if (result.success) {
      toast({
        title: "Clocked In Successfully",
        description: `Welcome! Your shift has started at ${new Date().toLocaleTimeString()}`,
      });
      setShowSelfieDialog(false);
      setSelfieFile(null);
      setSelfiePreview(null);
    } else {
      toast({
        title: "Clock In Failed",
        description: result.error || "Please ensure you are within the geofenced area.",
        variant: "destructive",
      });
    }
  };

  // Upload selfie and then clock in
  const processCheckInWithSelfie = async () => {
    if (!selfieFile) {
      toast({ title: "Selfie Required", description: "Please take a photo to check in.", variant: "destructive" });
      return;
    }

    setIsUploadingSelfie(true);
    try {
      // M4 FIX: Validate selfie file before uploading
      const MAX_SELFIE_BYTES = 10 * 1024 * 1024; // 10MB
      const ALLOWED_SELFIE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
      const ALLOWED_SELFIE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

      if (selfieFile.size > MAX_SELFIE_BYTES) {
        throw new Error(`Selfie is too large (${(selfieFile.size / 1024 / 1024).toFixed(1)}MB). Max limit is 10MB.`);
      }

      if (!ALLOWED_SELFIE_TYPES.includes(selfieFile.type)) {
        throw new Error(`Invalid file type. Allowed: ${ALLOWED_SELFIE_EXTS.join(', ')}`);
      }

      // Extract safe file extension
      let fileExt = 'jpg'; // safe default
      const mimeExt = selfieFile.type.split('/')[1]?.toLowerCase();
      if (mimeExt && ALLOWED_SELFIE_EXTS.includes(mimeExt)) {
        fileExt = mimeExt;
      } else {
        const nameExt = selfieFile.name.split('.').pop()?.toLowerCase();
        if (nameExt && ALLOWED_SELFIE_EXTS.includes(nameExt)) {
          fileExt = nameExt;
        }
      }

      const fileName = `${employeeId}-${Date.now()}.${fileExt}`;
      const filePath = `selfies/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attendance-selfies')
        .upload(filePath, selfieFile);

      if (uploadError) throw uploadError;

      // M5 FIX: Store the storage path instead of a 1-year signed URL.
      // Signed URLs expire and break if bucket policy changes.
      // The attendance display layer should generate signed URLs on-demand.
      await handleClockIn(filePath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Upload Failed", description: message, variant: "destructive" });
    } finally {
      setIsUploadingSelfie(false);
    }
  };

  const handleSelfieCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  // Handle Clock Out
  const handleClockOut = async () => {
    setIsClockingOut(true);
    const success = await clockOut();
    setIsClockingOut(false);

    if (success) {
      toast({
        title: "Clocked Out Successfully",
        description: `Your shift has ended at ${new Date().toLocaleTimeString()}`,
      });
    } else {
      toast({
        title: "Clock Out Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format time for display
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      {/* Panic Section */}
      <Card className="border-none bg-critical/10 shadow-lg shadow-critical/20">
        <CardContent className="p-8 text-center flex flex-col items-center gap-4">
          {/* Panic Button with Hold Progress */}
          <div
            className={cn(
              "h-24 w-24 rounded-full bg-critical flex items-center justify-center shadow-2xl cursor-pointer hover:scale-105 transition-transform active:scale-95 relative select-none",
              isPanicHolding && "scale-110",
              isPanicTriggering && "opacity-50 pointer-events-none"
            )}
            onMouseDown={startPanicHold}
            onMouseUp={handlePanicRelease}
            onMouseLeave={cancelPanicHold}
            onTouchStart={startPanicHold}
            onTouchEnd={handlePanicRelease}
          >
            {/* Progress Ring */}
            {isPanicHolding && (
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeDasharray={`${panicHoldProgress * 2.89} 289`}
                  strokeLinecap="round"
                  className="transition-all duration-100"
                />
              </svg>
            )}
            {isPanicTriggering ? (
              <Loader2 className="h-12 w-12 text-white animate-spin" />
            ) : (
              <Shield className="h-12 w-12 text-white fill-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-critical uppercase">
              {isPanicHolding
                ? `Hold... ${Math.round(panicHoldProgress)}%`
                : "Emergency Panic"}
            </h2>
            <p className="text-xs text-critical/70 font-bold uppercase tracking-widest mt-1">
              {isPanicTriggering
                ? "Sending Alert..."
                : "Press for 3 Seconds to Alert Manager"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Card */}
      <Card className="border-none shadow-card ring-1 ring-border overflow-hidden">
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Attendance
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={refresh}
              disabled={isLoading}
              aria-label="Refresh attendance status"
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* GPS Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  isLoading
                    ? "bg-muted"
                    : isWithinRange
                    ? "bg-success/20"
                    : "bg-warning/20"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                ) : isWithinRange ? (
                  <MapPin className="h-5 w-5 text-success" />
                ) : (
                  <Navigation className="h-5 w-5 text-warning" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  {isLoading ? "Detecting Location..." : "GPS Status"}
                </p>
                {!isLoading && (
                  <p
                    className={cn(
                      "text-sm font-bold",
                      isWithinRange ? "text-success" : "text-warning"
                    )}
                  >
                    {isWithinRange
                      ? `Within Range (${distance}m)`
                      : `Outside Range (${distance}m away)`}
                  </p>
                )}
                {gateLocation && (
                  <p className="text-[10px] text-muted-foreground">
                    {gateLocation.location_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-critical/10 text-critical">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p className="text-xs font-medium">{error}</p>
            </div>
          )}

          {/* Attendance Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/20 text-center">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Clocked In
              </p>
              <p className="text-lg font-bold text-success">
                {formatTime(todayAttendance?.check_in_time || null)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 text-center">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Clocked Out
              </p>
              <p className="text-lg font-bold text-muted-foreground">
                {formatTime(todayAttendance?.check_out_time || null)}
              </p>
            </div>
          </div>

          {/* Clock In/Out Button */}
          {!isClockedIn ? (
            <div className="space-y-3">
              <Button
                className="w-full h-14 text-base font-bold gap-2 bg-success hover:bg-success/90"
                onClick={() => setShowSelfieDialog(true)}
                disabled={isClockingIn || !isWithinRange || isLoading}
              >
                {isClockingIn ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                Start Shift (Clock In)
              </Button>
              {!isWithinRange && !isLoading && (
                <p className="text-[10px] text-warning text-center font-bold uppercase">
                  Approach the gate to enable Clock In
                </p>
              )}
            </div>
          ) : (
            <Button
              className="w-full h-14 text-base font-bold gap-2"
              variant="destructive"
              onClick={handleClockOut}
              disabled={isClockingOut}
            >
              {isClockingOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
              {isClockingOut ? "Clocking Out..." : "Clock Out"}
            </Button>
          )}

          {/* Warning if out of range */}
          {!isWithinRange && !isLoading && !error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-xs font-medium">
                Move closer to {gateLocation?.location_name || "the gate"} to
                clock in.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-gradient-to-br from-info/5 to-transparent">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Users className="h-5 w-5 text-info" />
              {isLoadingStats && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
            <div>
              <span className="text-2xl font-bold">
                {visitorStats.visitorsToday}
              </span>
              <p className="text-[10px] font-bold uppercase text-muted-foreground mt-1">
                Visitors Today
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-gradient-to-br from-warning/5 to-transparent">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <AlertCircle className="h-5 w-5 text-warning" />
              {isLoadingStats && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
            <div>
              <span className="text-2xl font-bold">
                {visitorStats.pendingCheckouts}
              </span>
              <p className="text-[10px] font-bold uppercase text-muted-foreground mt-1">
                Pending Checkouts
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Expected Visitors Section (Pre-Approved by Residents) */}
      <ExpectedVisitorsSection gateLocation={gateLocation} />
      {/* Duty Status */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-muted/20">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              {shiftInfo.shiftName || "Shift Time"}
            </span>
            <span className="text-sm font-bold">
              {shiftInfo.isLoading ? "Loading..." : `${shiftInfo.startTime} - ${shiftInfo.endTime}`}
            </span>
            <Badge
              className={cn(
                "w-fit text-[8px] mt-1",
                isClockedIn
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isClockedIn ? "ON DUTY" : "OFF DUTY"}
            </Badge>
          </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-muted/20">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              Location
            </span>
            <span className="text-sm font-bold">
              {gateLocation?.location_name || "Loading..."}
            </span>
            <div
              className={cn(
                "flex items-center gap-1 text-[8px] font-bold uppercase mt-1",
                isWithinRange ? "text-success" : "text-warning"
              )}
            >
              <MapPin className="h-2 w-2" />
              {isWithinRange ? "Geo-Fenced" : "Out of Range"}
            </div>
          </div>
        </Card>
      </div>

      {/* Checklist Hub */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="pb-3 border-b bg-muted/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Daily Checklist
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-bold">
              {isChecklistLoading ? "..." : `${checklistCompleted}/${checklistTotal} DONE`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {isChecklistLoading ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : checklistItems.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No checklist assigned yet.
              </div>
            ) : (
              <>
                {(showAllChecklist ? checklistItems : checklistItems.slice(0, 4)).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between group hover:bg-muted/30 transition-colors"
                  >
                    <div 
                      className="flex items-start gap-3 flex-1 cursor-pointer"
                      onClick={async () => {
                        if (item.status === "pending") {
                          const result = await completeChecklistItem(item.id, currentPosition || undefined);
                          if (result.success) {
                            toast({
                              title: "Task Completed",
                              description: `"${item.task}" marked as done.`,
                            });
                          } else {
                            toast({
                              title: "Error",
                              description: result.error || "Could not save.",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                          item.status === "done"
                            ? "bg-success border-success text-white"
                            : "border-muted"
                        )}
                      >
                        {item.status === "done" && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "text-xs font-bold",
                            item.status === "done"
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          )}
                        >
                          {item.task}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          {item.required && item.status === "pending" && (
                            <Badge variant="outline" className="text-[7px] h-3 px-1 text-critical border-critical/30 bg-critical/5 uppercase font-black">
                              Photo Proof Required
                            </Badge>
                          )}
                          {item.completedAt && (
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {item.photos && item.photos.length > 0 && (
                            <Badge variant="secondary" className="text-[8px] h-3 px-1">
                              {item.photos.length} PHOTO{item.photos.length > 1 ? 'S' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Evidence Action */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Add Photo Evidence"
                        aria-label="Add photo evidence for this task"
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById(`upload-${item.id}`)?.click();
                        }}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      <input
                        type="file"
                        id={`upload-${item.id}`}
                        className="hidden"
                        accept="image/*,application/pdf,.pdf"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleEvidenceUpload(item.id, file);
                          // Reset input so same file can be selected again if needed
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                ))}
                
                {checklistItems.length > 4 && (
                  <div className="p-2 text-center border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary text-[10px] font-bold uppercase h-7 hover:bg-primary/5"
                      onClick={() => setShowAllChecklist(!showAllChecklist)}
                    >
                      {showAllChecklist ? "Show Less" : `View All (${checklistItems.length})`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Quick Dial
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 pb-6">
          {isLoadingEmergencyContacts ? (
            <div className="col-span-2 flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : emergencyContacts.length > 0 ? (
            <>
              {emergencyContacts.slice(0, 6).map((contact) => {
                // Determine icon and color based on contact type
                const getContactStyle = (type: string) => {
                  switch (type) {
                    case 'police':
                      return { icon: <Shield className="h-3 w-3 text-primary" />, color: 'text-primary' };
                    case 'fire':
                      return { icon: <AlertCircle className="h-3 w-3 text-critical" />, color: 'text-critical' };
                    case 'ambulance':
                      return { icon: <Phone className="h-3 w-3 text-info" />, color: 'text-info' };
                    case 'lift_support':
                      return { icon: <Building className="h-3 w-3 text-warning" />, color: 'text-warning' };
                    default:
                      return { icon: <Phone className="h-3 w-3 text-muted-foreground" />, color: 'text-muted-foreground' };
                  }
                };
                const style = getContactStyle(contact.contact_type);
                
                return (
                  <a key={contact.id} href={`tel:${contact.phone_number}`} className="inline-flex">
                    <Button
                      variant="outline"
                      className="w-full h-10 justify-start gap-2 text-xs font-bold border-muted-foreground/20"
                    >
                      {style.icon}
                      <span className="truncate">
                        {contact.contact_name} ({contact.phone_number})
                      </span>
                    </Button>
                  </a>
                );
              })}
              {/* Always show supervisor if available */}
              {supervisorPhone && (
                <a href={`tel:${supervisorPhone}`} className="inline-flex">
                  <Button
                    variant="outline"
                    className="w-full h-10 justify-start gap-2 text-xs font-bold border-muted-foreground/20"
                  >
                    <Phone className="h-3 w-3 text-success" /> Supervisor
                  </Button>
                </a>
              )}
            </>
          ) : (
            /* Fallback to hardcoded numbers if database is empty */
            <>
              <a href="tel:100" className="inline-flex">
                <Button
                  variant="outline"
                  className="w-full h-10 justify-start gap-2 text-xs font-bold border-muted-foreground/20"
                >
                  <Shield className="h-3 w-3 text-primary" /> Police (100)
                </Button>
              </a>
              <a href="tel:101" className="inline-flex">
                <Button
                  variant="outline"
                  className="w-full h-10 justify-start gap-2 text-xs font-bold border-muted-foreground/20"
                >
                  <AlertCircle className="h-3 w-3 text-critical" /> Fire (101)
                </Button>
              </a>
              <a href="tel:102" className="inline-flex">
                <Button
                  variant="outline"
                  className="w-full h-10 justify-start gap-2 text-xs font-bold border-muted-foreground/20"
                >
                  <Phone className="h-3 w-3 text-info" /> Ambulance (102)
                </Button>
              </a>
              {supervisorPhone && (
                <a href={`tel:${supervisorPhone}`} className="inline-flex">
                  <Button
                    variant="outline"
                    className="w-full h-10 justify-start gap-2 text-xs font-bold border-muted-foreground/20"
                  >
                    <Phone className="h-3 w-3 text-success" /> Supervisor
                  </Button>
                </a>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {/* Selfie Capture Dialog */}
      {showSelfieDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in transition-all">
          <Card className="w-full max-w-sm border-none shadow-2xl ring-1 ring-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Identity Verification
              </CardTitle>
              <p className="text-xs text-muted-foreground">Please take a selfie to verify your identity and start your shift.</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div className="relative aspect-square rounded-2xl bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-primary/20">
                {selfiePreview ? (
                  <img src={selfiePreview} alt="Selfie preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6">
                    <Camera className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Camera Ready</p>
                  </div>
                )}
                {!isUploadingSelfie && !isClockingIn && (
                  <label className="absolute inset-0 cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="user" 
                      className="hidden" 
                      onChange={handleSelfieCapture} 
                    />
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  className="w-full h-12 font-bold uppercase tracking-wider gap-2 shadow-lg shadow-primary/20"
                  disabled={!selfieFile || isUploadingSelfie || isClockingIn}
                  onClick={processCheckInWithSelfie}
                >
                  {isUploadingSelfie || isClockingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {isUploadingSelfie ? "Uploading Signature..." : "Confirm & Clock In"}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-xs font-bold uppercase text-muted-foreground"
                  disabled={isUploadingSelfie || isClockingIn}
                  onClick={() => {
                    setShowSelfieDialog(false);
                    setSelfieFile(null);
                    setSelfiePreview(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
