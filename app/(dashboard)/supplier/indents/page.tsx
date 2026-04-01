"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Check, Info, MapPin, Search, Users, X } from "lucide-react";

import { useSupplierPortal } from "@/hooks/useSupplierPortal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

function isServiceIndent(indent: any) {
  return Boolean(
    indent.service_type ||
      indent.service_grade ||
      indent.headcount ||
      indent.shift ||
      indent.start_date ||
      indent.duration_months ||
      indent.site_location_id
  );
}

export default function SupplierIndentsPage() {
  const { indents, respondToIndent, isLoading } = useSupplierPortal();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedIndent, setSelectedIndent] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filteredIndents = indents.filter(
    (indent) =>
      indent.request_number.toLowerCase().includes(search.toLowerCase()) ||
      (indent.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (indent.service_grade || "").toLowerCase().includes(search.toLowerCase())
  );

  const openDetails = (indent: any) => {
    setSelectedIndent(indent);
    setIsDetailOpen(true);
  };

  const handleAccept = async (id: string) => {
    const success = await respondToIndent(id, "indent_accepted");
    if (success) {
      toast({
        title: "Indent Accepted",
        description: "The indent has been accepted and the buyer request has been advanced.",
      });
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedIndent?.id || !rejectionReason) return;

    const success = await respondToIndent(selectedIndent.id, "indent_rejected", rejectionReason);
    if (success) {
      toast({
        title: "Indent Rejected",
        description: "Admin has been notified of your decision.",
        variant: "destructive",
      });
      setIsRejectOpen(false);
      setRejectionReason("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incoming Requests</h1>
          <p className="text-muted-foreground">
            Review indents forwarded to you and confirm feasibility.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-9 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Search request ID, title, or role..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Deployment</TableHead>
                <TableHead>Schedule / Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 animate-pulse italic">
                    Loading requests...
                  </TableCell>
                </TableRow>
              ) : filteredIndents.length > 0 ? (
                filteredIndents.map((indent) => (
                  <TableRow key={indent.id}>
                    <TableCell className="font-mono font-bold">{indent.request_number}</TableCell>
                    <TableCell>
                      <div className="font-medium">{indent.title}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                        {indent.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isServiceIndent(indent) ? (
                        <div className="space-y-1 text-sm">
                          <div className="font-medium">{indent.service_grade || indent.service_type || "Service deployment"}</div>
                          <div className="text-xs text-muted-foreground">
                            {indent.headcount || 0} headcount • {indent.shift || "Shift pending"}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="secondary">{indent.request_items?.length || 0} items</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isServiceIndent(indent) ? (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span>
                              {indent.start_date
                                ? format(new Date(indent.start_date), "dd MMM yyyy")
                                : "Start date pending"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{indent.site_location_name || "Site pending"}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm">{new Date(indent.created_at).toLocaleDateString()}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          indent.status === "indent_accepted"
                            ? "bg-success/20 text-success"
                            : indent.status === "indent_rejected"
                              ? "bg-critical/20 text-critical"
                              : indent.status === "po_issued"
                                ? "bg-info/20 text-info"
                                : "bg-warning/20 text-warning"
                        }
                      >
                        {indent.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {indent.status === "indent_forwarded" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success hover:text-success border-success/30 hover:bg-success/10"
                            onClick={() => handleAccept(indent.id)}
                          >
                            <Check className="h-3 w-3 mr-1" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-critical hover:text-critical border-critical/30 hover:bg-critical/10"
                            onClick={() => {
                              setSelectedIndent(indent);
                              setIsRejectOpen(true);
                            }}
                          >
                            <X className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => openDetails(indent)}>
                          <Info className="h-4 w-4 mr-1" /> Details
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedIndent?.request_number}</DialogTitle>
            <DialogDescription>
              Service and indent details assigned to your supplier account.
            </DialogDescription>
          </DialogHeader>

          {selectedIndent && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium">{selectedIndent.title}</p>
                <p className="text-muted-foreground mt-1">{selectedIndent.description}</p>
              </div>

              {isServiceIndent(selectedIndent) && (
                <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {selectedIndent.service_grade || selectedIndent.service_type || "Service deployment"}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {selectedIndent.headcount || 0} headcount • {selectedIndent.shift || "Shift pending"}
                  </div>
                  <div className="text-muted-foreground">
                    Duration: {selectedIndent.duration_months || 0} month(s)
                  </div>
                  <div className="text-muted-foreground">
                    Start date:{" "}
                    {selectedIndent.start_date
                      ? format(new Date(selectedIndent.start_date), "dd MMM yyyy")
                      : "Pending"}
                  </div>
                  <div className="text-muted-foreground">
                    Site location: {selectedIndent.site_location_name || "Pending"}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Indent</DialogTitle>
            <DialogDescription>
              Please provide a reason why you cannot fulfill this request. This will be visible to the admin.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!rejectionReason}
              onClick={handleRejectSubmit}
              className="bg-critical hover:bg-critical/90"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
