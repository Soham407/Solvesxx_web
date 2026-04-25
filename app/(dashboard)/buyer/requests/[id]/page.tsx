"use client";

import { useBuyerRequests, REQUEST_STATUS_CONFIG, RequestStatus } from "@/hooks/useBuyerRequests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Clock,
  Package,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  History,
  Truck,
  FileCheck,
  PackageCheck,
  Star,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { BuyerFeedbackDialog } from "@/components/dialogs/BuyerFeedbackDialog";

export default function BuyerRequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const requestId = params.id as string;
  const { requests, fetchRequestItems, updateRequestStatus, isLoading, refresh } = useBuyerRequests();
  
  const [request, setRequest] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    const req = requests.find(r => r.id === requestId);
    if (req) {
      setRequest(req);
      fetchRequestItems(requestId).then(setItems);
      setIsLoadingDetails(false);
    }
  }, [requestId, requests, fetchRequestItems]);

  const handleDecision = async (status: 'material_acknowledged' | 'rejected', reason?: string) => {
    const success = await updateRequestStatus(requestId, status as RequestStatus, reason);
    if (success) {
      toast({
        title: status === 'material_acknowledged' ? "Delivery Accepted" : "Delivery Rejected",
        description: status === 'material_acknowledged' 
          ? "You have successfully acknowledged the delivery." 
          : "Delivery rejected. Admin will be notified."
      });
    }
  };

  if (isLoading || isLoadingDetails) {
    return <div className="flex h-64 items-center justify-center italic text-muted-foreground animate-pulse">Loading request details...</div>;
  }

  if (!request) {
    return <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
      <h2 className="text-xl font-bold">Request Not Found</h2>
      <p className="text-muted-foreground mb-4">The order request you are looking for does not exist or has been removed.</p>
      <Link href="/buyer/requests">
        <Button variant="outline">Back to Requests</Button>
      </Link>
    </div>;
  }

  const currentStatus = REQUEST_STATUS_CONFIG[request.status as RequestStatus];

  // Helper to determine if decision buttons should show
  // Buyer can acknowledge/reject when status is 'po_dispatched' or 'material_received'
  const canMakeDecision = ['po_dispatched', 'material_received'].includes(request.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/buyer/requests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{request.request_number}</h1>
            <Badge className={`text-xs ${currentStatus?.className}`}>
              {currentStatus?.buyerLabel.toUpperCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground">Submitted on {format(new Date(request.created_at), 'MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* Feedback Required Banner */}
      {request.status === 'feedback_pending' && (
        <Alert className="border-warning/40 bg-warning/5">
          <Star className="h-4 w-4 text-warning" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-warning">
              Feedback required — please rate this service to complete the transaction.
            </span>
            <Button
              size="sm"
              className="shrink-0 gap-1.5 bg-warning text-warning-foreground hover:bg-warning/90"
              onClick={() => setFeedbackOpen(true)}
            >
              <Star className="h-3.5 w-3.5" /> Leave Feedback
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-muted-foreground">Title / Summary</Label>
                <p className="text-lg font-medium">{request.title}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm whitespace-pre-wrap">{request.description || "No description provided."}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Preferred Delivery Date</Label>
                  <p className="text-sm font-medium">
                    {request.preferred_delivery_date 
                      ? format(new Date(request.preferred_delivery_date), 'MMM d, yyyy') 
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delivery Location</Label>
                  <p className="text-sm font-medium">{request.location_name || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requested Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-right">{item.quantity} {item.unit || "units"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">{item.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No items found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Progress / Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-4 w-4" /> Progress Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4 pl-4 before:absolute before:left-0 before:top-2 before:h-[calc(100%-16px)] before:w-[2px] before:bg-muted">
                {/* Simplified timeline for buyer */}
                <TimelineItem 
                  label="Submitted" 
                  date={request.created_at} 
                  active={true} 
                  done={true} 
                  icon={Clock}
                />
                <TimelineItem 
                  label="Order Processing" 
                  active={['accepted', 'indent_generated', 'indent_forwarded', 'indent_accepted', 'po_issued', 'po_received'].includes(request.status)} 
                  done={['po_dispatched', 'material_received', 'material_acknowledged', 'completed'].includes(request.status)}
                  icon={FileCheck}
                />
                <TimelineItem 
                  label="Dispatched" 
                  active={request.status === 'po_dispatched'} 
                  done={['material_received', 'material_acknowledged', 'completed'].includes(request.status)}
                  icon={Truck}
                />
                <TimelineItem 
                  label="Delivered" 
                  active={request.status === 'material_received'} 
                  done={['material_acknowledged', 'completed'].includes(request.status)}
                  icon={PackageCheck}
                />
              </div>
            </CardContent>
          </Card>

          {/* Decision Box */}
          {canMakeDecision && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Delivery Decision</CardTitle>
                <CardDescription>Please acknowledge if you have received the items.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button 
                  className="w-full gap-2" 
                  onClick={() => handleDecision('material_acknowledged')}
                >
                  <CheckCircle2 className="h-4 w-4" /> Acknowledge Delivery
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full gap-2 text-critical hover:text-critical"
                  onClick={() => {
                    const reason = prompt("Enter reason for rejection:");
                    if (reason) handleDecision('rejected', reason);
                  }}
                >
                  <XCircle className="h-4 w-4" /> Reject Delivery
                </Button>
              </CardContent>
            </Card>
          )}

          {request.status === 'rejected' && (
            <Card className="border-critical/50 bg-critical/5">
              <CardHeader>
                <CardTitle className="text-lg text-critical flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Rejection Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">Reason:</p>
                <p className="text-sm text-muted-foreground">{request.rejection_reason || "No reason provided."}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Rejected on {request.rejected_at ? format(new Date(request.rejected_at), 'MMM d, yyyy') : "N/A"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {/* Feedback Dialog */}
      <BuyerFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        requestId={request.id}
        requestNumber={request.request_number}
        onSuccess={async () => {
          setFeedbackOpen(false);
          await refresh();
          const req = requests.find(r => r.id === requestId);
          if (req) setRequest({ ...req });
        }}
      />
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${className}`}>{children}</div>;
}

function TimelineItem({ label, date, active, done, icon: Icon }: { label: string; date?: string; active: boolean; done: boolean; icon: any }) {
  return (
    <div className="relative pl-6">
      <div className={`absolute left-[-19px] top-0 p-1 rounded-full border-2 bg-background z-10 
        ${done ? 'border-success text-success' : active ? 'border-primary text-primary animate-pulse' : 'border-muted text-muted-foreground'}
      `}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-bold ${active ? 'text-primary' : done ? 'text-success' : 'text-muted-foreground'}`}>{label}</span>
        {date && <span className="text-[10px] text-muted-foreground">{format(new Date(date), 'MMM d, p')}</span>}
      </div>
    </div>
  );
}
