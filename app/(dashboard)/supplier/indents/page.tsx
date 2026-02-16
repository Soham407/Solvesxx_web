"use client";

import { useSupplierPortal } from "@/hooks/useSupplierPortal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Filter, Check, X, Info } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function SupplierIndentsPage() {
  const { indents, respondToIndent, isLoading } = useSupplierPortal();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedIndent, setSelectedIndent] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const filteredIndents = indents.filter(i => 
    i.request_number.toLowerCase().includes(search.toLowerCase()) ||
    i.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleAccept = async (id: string) => {
    const success = await respondToIndent(id, 'indent_accepted');
    if (success) {
      toast({ title: "Indent Accepted", description: "The admin will proceed with the PO." });
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason) return;
    const success = await respondToIndent(selectedIndent.id, 'indent_rejected', rejectionReason);
    if (success) {
      toast({ title: "Indent Rejected", description: "Admin has been notified of your decision.", variant: "destructive" });
      setIsRejectOpen(false);
      setRejectionReason("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incoming Requests</h1>
          <p className="text-muted-foreground">Review indents forwarded to you and confirm feasibility.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input 
            className="w-full pl-9 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Search request ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 animate-pulse italic">Loading requests...</TableCell>
                </TableRow>
              ) : filteredIndents.length > 0 ? (
                filteredIndents.map((indent) => (
                  <TableRow key={indent.id}>
                    <TableCell className="font-mono font-bold">{indent.request_number}</TableCell>
                    <TableCell>
                      <div className="font-medium">{indent.title}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{indent.description}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(indent.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{indent.request_items?.length || 0} items</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        indent.status === 'indent_accepted' ? 'bg-success/20 text-success' :
                        indent.status === 'indent_rejected' ? 'bg-critical/20 text-critical' :
                        'bg-warning/20 text-warning'
                      }>
                        {indent.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {indent.status === 'indent_forwarded' && (
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
                            onClick={() => { setSelectedIndent(indent); setIsRejectOpen(true); }}
                          >
                            <X className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                      {indent.status !== 'indent_forwarded' && (
                        <Button variant="ghost" size="sm" onClick={() => setSelectedIndent(indent)}>
                          <Info className="h-4 w-4 mr-1" /> Details
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No requests found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Indent</DialogTitle>
            <DialogDescription>Please provide a reason why you cannot fulfill this request. This will be visible to the admin.</DialogDescription>
          </DialogHeader>
          <Textarea 
            placeholder="Reason for rejection..." 
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button disabled={!rejectionReason} onClick={handleRejectSubmit} className="bg-critical hover:bg-critical/90">Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
