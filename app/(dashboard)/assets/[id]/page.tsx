"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Package,
  MapPin,
  Calendar,
  Settings,
  History,
  ClipboardList,
  Wrench,
  QrCode,
  Edit,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  Download,
  ChevronRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAssets } from "@/hooks/useAssets";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { AssetForm, QrCodeDisplay, ServiceRequestForm } from "@/components/phaseB";
import type { AssetWithDetails, ServiceRequestWithDetails, AssetStatus } from "@/src/types/phaseB";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_COLORS,
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_COLORS,
  SERVICE_PRIORITY_COLORS,
} from "@/src/lib/constants";

// Detail row component for consistent display
function DetailRow({ 
  label, 
  value, 
  icon: Icon,
  className 
}: { 
  label: string; 
  value: string | number | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={cn("flex items-start gap-3 py-3 border-b border-border/50 last:border-0", className)}>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// Status badge component
function AssetStatusBadge({ status }: { status: string }) {
  const color = ASSET_STATUS_COLORS[status] || "#6b7280";
  const label = ASSET_STATUS_LABELS[status] || status;
  
  return (
    <Badge 
      variant="outline" 
      className="font-medium"
      style={{ borderColor: color, color: color }}
    >
      {label}
    </Badge>
  );
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;
  
  const [asset, setAsset] = useState<AssetWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showCreateRequestDialog, setShowCreateRequestDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { getAssetById, updateAsset } = useAssets();
  const { schedules, isLoading: isSchedulesLoading } = useMaintenanceSchedules(assetId);
  const { requests, isLoading: isRequestsLoading } = useServiceRequests();

  // Filter requests for this asset
  const assetRequests = requests.filter(r => r.asset_id === assetId);

  // Fetch asset details
  useEffect(() => {
    async function fetchAsset() {
      if (!assetId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await getAssetById(assetId);
        if (result) {
          setAsset(result);
        } else {
          setError("Asset not found");
        }
      } catch (err) {
        setError("Failed to load asset details");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAsset();
  }, [assetId]);

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (!asset?.id) return;
    
    try {
      await updateAsset(asset.id, { status: newStatus as AssetStatus });
      // Refetch to get updated data
      const updated = await getAssetById(assetId);
      if (updated) setAsset(updated);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading asset details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !asset) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive/50" />
          <h2 className="mt-4 text-lg font-semibold">Asset Not Found</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error || "The requested asset could not be found."}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/assets")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/assets")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{asset.name}</h1>
              <AssetStatusBadge status={asset.status || "functional"} />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <span className="font-mono">{asset.asset_code}</span>
              {asset.category_name && (
                <>
                  <span>•</span>
                  <span>{asset.category_name}</span>
                </>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowQrDialog(true)}>
            <QrCode className="h-4 w-4 mr-2" />
            View QR
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCreateRequestDialog(true)}>
            <ClipboardList className="h-4 w-4 mr-2" />
            Create Request
          </Button>
          <Button size="sm" onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview" className="gap-2">
                <Package className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-2">
                <Wrench className="h-4 w-4" />
                Maintenance
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Requests
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card className="border-none shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Asset Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <DetailRow label="Asset ID" value={asset.id} />
                  <DetailRow label="Asset Code" value={asset.asset_code} icon={Package} />
                  <DetailRow label="Name" value={asset.name} />
                  <DetailRow label="Category" value={asset.category_name} />
                  <DetailRow label="Description" value={asset.description} />
                  <DetailRow 
                    label="Status" 
                    value={ASSET_STATUS_LABELS[asset.status || "functional"]} 
                    icon={asset.status === "functional" ? CheckCircle : AlertTriangle}
                  />
                  {asset.specifications && Object.keys(asset.specifications).length > 0 && (
                    <div className="py-3 border-b border-border/50">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Specifications
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(asset.specifications).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-muted-foreground">{key}:</span>{" "}
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Location & Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <DetailRow label="Location" value={asset.location_name} icon={MapPin} />
                  <DetailRow label="Purchase Date" value={formatDate(asset.purchase_date)} icon={Calendar} />
                  <DetailRow label="Warranty Expiry" value={formatDate(asset.warranty_expiry)} icon={Calendar} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Maintenance Tab */}
            <TabsContent value="maintenance" className="space-y-4">
              <Card className="border-none shadow-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Maintenance Schedules
                    </CardTitle>
                    <Badge variant="outline">{schedules.length} schedules</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {isSchedulesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : schedules.length === 0 ? (
                    <div className="text-center py-8">
                      <Wrench className="h-12 w-12 mx-auto text-muted-foreground/30" />
                      <p className="mt-2 text-sm text-muted-foreground">No maintenance schedules</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {schedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{schedule.task_name || 'Scheduled Maintenance'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {schedule.frequency} • Next: {formatDate(schedule.next_due_date)}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Requests Tab */}
            <TabsContent value="requests" className="space-y-4">
              <Card className="border-none shadow-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Service Requests
                    </CardTitle>
                    <Badge variant="outline">{assetRequests.length} requests</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {isRequestsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : assetRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30" />
                      <p className="mt-2 text-sm text-muted-foreground">No service requests for this asset</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={() => setShowCreateRequestDialog(true)}
                      >
                        Create Request
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assetRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => router.push(`/service-requests/${request.id}`)}
                        >
                          <div
                            className="h-10 w-1 rounded-full shrink-0"
                            style={{ backgroundColor: SERVICE_PRIORITY_COLORS[request.priority || "normal"] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {request.request_number}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-[10px]"
                                style={{
                                  borderColor: SERVICE_REQUEST_STATUS_COLORS[request.status || "open"],
                                  color: SERVICE_REQUEST_STATUS_COLORS[request.status || "open"],
                                }}
                              >
                                {SERVICE_REQUEST_STATUS_LABELS[request.status || "open"]}
                              </Badge>
                            </div>
                            <p className="font-medium mt-1 truncate">
                              {request.title || request.description?.substring(0, 50)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(request.created_at)}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card className="border-none shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Activity History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <History className="h-12 w-12 mx-auto text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">Activity history coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          {/* QR Code Card */}
          <Card className="border-none shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {asset.qr_id ? (
                <div className="text-center">
                  <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center mb-3">
                    <QrCode className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{String(asset.qr_id).substring(0, 8)}...</p>
                  <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setShowQrDialog(true)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download QR
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <QrCode className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">No QR code linked</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-none shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setShowCreateRequestDialog(true)}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Create Service Request
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Asset Details
              </Button>
              {asset.status === "functional" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-amber-600 hover:text-amber-700"
                  onClick={() => handleStatusChange("under_maintenance")}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Mark Under Maintenance
                </Button>
              ) : asset.status === "under_maintenance" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-success hover:text-success/80"
                  onClick={() => handleStatusChange("functional")}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Functional
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Asset Info Summary */}
          {asset.manufacturer && (
            <Card className="border-none shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Manufacturer Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DetailRow label="Manufacturer" value={asset.manufacturer} />
                <DetailRow label="Model" value={asset.model_number} />
                <DetailRow label="Serial Number" value={asset.serial_number} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Asset Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
          </DialogHeader>
          <AssetForm
            asset={asset}
            onSuccess={() => {
              setShowEditDialog(false);
              // Refresh asset data
              getAssetById(assetId).then(setAsset);
            }}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asset QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {asset.qr_id ? (
              <QrCodeDisplay qrId={String(asset.qr_id)} asset={asset} />
            ) : (
              <div className="text-center">
                <QrCode className="h-24 w-24 mx-auto text-muted-foreground/30" />
                <p className="mt-4 text-sm text-muted-foreground">No QR code linked to this asset</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Service Request Dialog */}
      <Dialog open={showCreateRequestDialog} onOpenChange={setShowCreateRequestDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Service Request</DialogTitle>
          </DialogHeader>
          <ServiceRequestForm
            preselectedAsset={asset}
            onSuccess={() => setShowCreateRequestDialog(false)}
            onCancel={() => setShowCreateRequestDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
