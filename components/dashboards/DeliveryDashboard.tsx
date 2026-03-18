"use client";

import { useState, useEffect, useCallback } from "react";
import { Truck, Package, Camera, Loader2, CheckCircle2, History, MapPin, Scan, Clock, CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeliveryLogs, ArrivalLog } from "@/hooks/useDeliveryLogs";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/src/lib/supabaseClient";

export function DeliveryDashboard() {
  const { toast } = useToast();
  const { logMaterialArrival, getArrivalLogs, isLoading: isActionLoading } = useDeliveryLogs();
  
  const { purchaseOrders, isLoading: isPOsLoading } = usePurchaseOrders();
  
  const [activeTab, setActiveTab] = useState("log");
  const [selectedPOId, setSelectedPOId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [gateLocation, setGateLocation] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [logs, setLogs] = useState<ArrivalLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // FIX: Wrap loadLogs in useCallback to prevent stale closures
  const loadLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const data = await getArrivalLogs();
      setLogs(data);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [getArrivalLogs]);

  // Fetch logs on mount
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // FIX: Revoke object URL on cleanup to prevent memory leak
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Revoke previous URL before creating a new one
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setSelectedPOId("");
    setVehicleNumber("");
    setNotes("");
    setGateLocation("");
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
  };

  const handleSubmit = async () => {
    if (!selectedPOId || !vehicleNumber || !photoFile) {
      toast({
        title: "Missing Information",
        description: "Please select a PO, enter vehicle number, and capture a photo.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload photo to Supabase Storage
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${selectedPOId}-${Date.now()}.${fileExt}`;
      const filePath = `arrivals/${fileName}`;

      const { error: uploadError } = await (supabase as any).storage
        .from("material-arrivals")
        .upload(filePath, photoFile);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: urlData } = (supabase as any).storage
        .from("material-arrivals")
        .getPublicUrl(filePath);

      const photoUrl = urlData.publicUrl;

      // 3. Log arrival via RPC
      const result = await logMaterialArrival({
        poId: selectedPOId,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        arrivalPhotoUrl: photoUrl,
        gateLocation: gateLocation.trim(),
        notes: notes.trim(),
      });

      if (result) {
        toast({
          title: "Successfully Logged",
          description: "Material arrival documented in Truth Engine.",
        });
        resetForm();
        loadLogs();
      } else {
        toast({
          title: "Logging Failed",
          description: "The Truth Engine RPC returned no result. Check permissions.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log arrival",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Filter for POs that are in process
  const activePOs = purchaseOrders.filter(po =>
    po.status === "sent_to_vendor" || po.status === "acknowledged" || po.status === "partial_received"
  );

  // Expected today: POs with expected_delivery_date = today (or within next 24hrs) AND active status
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const expectedTodayPOs = purchaseOrders.filter(po => {
    if (!po.expected_delivery_date) return false;
    const deliveryDate = po.expected_delivery_date.split("T")[0];
    const isActiveStatus = po.status === "sent_to_vendor" || po.status === "acknowledged";
    return isActiveStatus && (deliveryDate === todayStr || deliveryDate === tomorrowStr);
  });

  const getStatusBadgeClass = (status: string | null) => {
    switch (status) {
      case "sent_to_vendor": return "bg-warning/10 text-warning border-warning/20";
      case "acknowledged": return "bg-info/10 text-info border-info/20";
      case "partial_received": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatStatusLabel = (status: string | null) => {
    switch (status) {
      case "sent_to_vendor": return "Sent to Vendor";
      case "acknowledged": return "Acknowledged";
      case "partial_received": return "Partial Received";
      default: return status ?? "Unknown";
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 text-left">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
             <Truck className="h-6 w-6 text-primary" />
             Delivery Tracking
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Operational Truth Engine • Phase E
          </p>
        </div>
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
           <Package className="h-5 w-5 text-primary" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 h-12 bg-muted/50 p-1">
          <TabsTrigger value="log" className="text-xs font-bold uppercase tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Scan className="h-3.5 w-3.5" /> Log Arrival
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-bold uppercase tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <History className="h-3.5 w-3.5" /> Recent Logs
          </TabsTrigger>
          <TabsTrigger value="expected" className="text-xs font-bold uppercase tracking-widest gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
            <CalendarCheck className="h-3.5 w-3.5" />
            Expected
            {expectedTodayPOs.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-critical flex items-center justify-center text-[8px] font-black text-white">
                {expectedTodayPOs.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-card ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-muted/5 border-b pb-4">
              <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Material Arrival Log
              </CardTitle>
              <CardDescription className="text-xs">
                Mandatory evidence capture for gate entry
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* PO Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider">Purchase Order</Label>
                <select 
                  className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={selectedPOId}
                  onChange={(e) => setSelectedPOId(e.target.value)}
                >
                  <option value="">Select an Active PO</option>
                  {activePOs.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.po_number || 'PO-####'} - {po.supplier_name}
                    </option>
                  ))}
                </select>
                {isPOsLoading && <p className="text-[10px] text-muted-foreground italic">Loading active POs...</p>}
                {!isPOsLoading && activePOs.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic">No active POs available</p>
                )}
              </div>

              {/* Vehicle Number */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider">Vehicle Number</Label>
                <div className="relative">
                  <Input 
                    placeholder="e.g. MH 12 AB 1234" 
                    className="h-11 pl-10 capitalize"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                  />
                  <Truck className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/50" />
                </div>
              </div>

              {/* Photo Evidence */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider">Arrival Photo (Evidence)</Label>
                <div 
                  className="border-2 border-dashed border-muted-foreground/20 rounded-xl aspect-[16/10] flex flex-col items-center justify-center gap-3 bg-muted/5 relative overflow-hidden group hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => document.getElementById("photo-upload")?.click()}
                >
                  {photoPreview ? (
                    <div className="relative w-full h-full">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">Click to take arrival photo</p>
                    </>
                  )}
                  <input 
                    id="photo-upload"
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    className="hidden" 
                    onChange={handlePhotoChange}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                   <CheckCircle2 className="h-3 w-3 text-success" /> Mandatory verification photo
                </p>
              </div>

              {/* Gate Location */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Gate Location
                </Label>
                <Input 
                  placeholder="e.g. Main Gate, South Gate" 
                  className="h-11"
                  value={gateLocation}
                  onChange={(e) => setGateLocation(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider">Notes (Optional)</Label>
                <textarea 
                  className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Add any delivery observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button 
                className="w-full h-12 text-sm font-bold uppercase tracking-widest shadow-lg shadow-primary/20"
                disabled={isUploading || isActionLoading || !selectedPOId || !vehicleNumber || !photoFile}
                onClick={handleSubmit}
              >
                {isUploading || isActionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Log Material Arrival"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="space-y-4">
             {isLoadingLogs ? (
               <div className="flex justify-center py-12">
                 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
               </div>
             ) : logs.length === 0 ? (
               <Card className="border-none bg-muted/20">
                 <CardContent className="p-12 text-center">
                    <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No recent arrival logs</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-widest">Truth Engine verified history will appear here</p>
                 </CardContent>
               </Card>
             ) : (
               logs.map(log => (
                 <Card key={log.id} className="border-none shadow-card ring-1 ring-border group hover:ring-primary/50 transition-all overflow-hidden bg-card">
                   <CardContent className="p-0 flex flex-col sm:flex-row">
                     <div className="sm:h-24 sm:w-24 w-full h-40 bg-muted overflow-hidden shrink-0">
                       <img src={log.photo_url} alt="Arrival evidence" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                     </div>
                     <div className="flex-1 p-4 min-w-0">
                       <div className="flex items-center justify-between mb-1">
                         <p className="font-black text-sm text-foreground truncate">{log.po_number || 'PO-####'}</p>
                         <Badge variant="outline" className="text-[10px] font-black uppercase bg-primary/5 border-primary/20">
                           {log.vehicle_number}
                         </Badge>
                       </div>
                       <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground mt-2">
                         <span className="flex items-center gap-1 font-bold">
                            <Clock className="h-3 w-3" /> {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                         <span className="flex items-center gap-1 font-bold">
                            <MapPin className="h-3 w-3" /> {log.gate_location || 'Main Gate'}
                         </span>
                         <span className="flex items-center gap-1 font-bold text-primary">
                            <CheckCircle2 className="h-3 w-3" /> DOCUMENTED
                         </span>
                       </div>
                       {log.notes && (
                         <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2 italic border-l-2 border-primary/20 pl-2">
                           &ldquo;{log.notes}&rdquo;
                         </p>
                       )}
                     </div>
                   </CardContent>
                 </Card>
               ))
             )}
           </div>
        </TabsContent>

        <TabsContent value="expected" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-4">
            {isPOsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : expectedTodayPOs.length === 0 ? (
              <Card className="border-none bg-muted/20">
                <CardContent className="p-12 text-center">
                  <CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No deliveries expected today</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-widest">Check back later or log an unscheduled arrival</p>
                </CardContent>
              </Card>
            ) : (
              expectedTodayPOs.map(po => (
                <Card key={po.id} className="border-none shadow-card ring-1 ring-border group hover:ring-primary/50 transition-all overflow-hidden bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-sm truncate">{po.po_number || "PO-####"}</p>
                          <p className="text-xs text-muted-foreground truncate">{po.supplier_name || "Unknown Supplier"}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold uppercase shrink-0 ${getStatusBadgeClass(po.status)}`}
                      >
                        {formatStatusLabel(po.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold">
                        <CalendarCheck className="h-3 w-3" />
                        Expected:{" "}
                        {po.expected_delivery_date
                          ? new Date(po.expected_delivery_date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] font-bold uppercase tracking-wider"
                        onClick={() => {
                          setSelectedPOId(po.id);
                          setActiveTab("log");
                        }}
                      >
                        Log Arrival
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
