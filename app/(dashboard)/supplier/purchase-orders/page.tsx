"use client";

import { useSupplierPortal, POStatus } from "@/hooks/useSupplierPortal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Package, MapPin, Truck, CheckCircle, Calculator, FileCheck, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/src/lib/utils/currency";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SupplierPOsPage() {
  const { pos, acknowledgePO, dispatchPO, isLoading } = useSupplierPortal();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  
  // Dispatch Dialog State
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");

  const filteredPOs = pos.filter(p => 
    p.po_number.toLowerCase().includes(search.toLowerCase())
  );

  const handleAcknowledge = async (id: string) => {
    const success = await acknowledgePO(id);
    if (success) {
      toast({ title: "PO Acknowledged", description: "You have confirmed receipt of the Purchase Order." });
    }
  };

  const handleDispatchSubmit = async () => {
    const success = await dispatchPO(selectedPO.id, {
      date: dispatchDate,
      vehicle: vehicle,
      notes: notes
    });
    if (success) {
      toast({ title: "Order Dispatched", description: "Shipment status updated successfully." });
      setIsDispatchOpen(false);
      setVehicle("");
      setNotes("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
        <p className="text-muted-foreground">Manage order acknowledgment and shipment tracking.</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input 
            className="w-full pl-9 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Search PO number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Expected Delivery</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 animate-pulse italic">Loading orders...</TableCell>
              </TableRow>
            ) : filteredPOs.length > 0 ? (
              filteredPOs.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono font-bold">{po.po_number}</TableCell>
                  <TableCell className="text-sm">{new Date(po.po_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm italic">
                    {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : "Not set"}
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(po.grand_total)}</TableCell>
                  <TableCell>
                    <Badge className={
                      po.status === 'acknowledged' ? 'bg-info/20 text-info' :
                      po.status === 'dispatched' ? 'bg-primary/20 text-primary' :
                      po.status === 'received' ? 'bg-success/20 text-success' :
                      'bg-muted text-muted-foreground'
                    }>
                      {po.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {po.status === 'sent_to_vendor' && (
                        <Button size="sm" onClick={() => handleAcknowledge(po.id)} className="gap-2">
                          <FileCheck className="h-4 w-4" /> Acknowledge
                        </Button>
                      )}
                      
                      {po.status === 'acknowledged' && (
                        <Button size="sm" variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5" onClick={() => { setSelectedPO(po); setIsDispatchOpen(true); }}>
                          <Truck className="h-4 w-4" /> Mark Dispatched
                        </Button>
                      )}

                      {['dispatched', 'received'].includes(po.status) && (
                        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setSelectedPO(po)}>
                          Details <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No orders found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dispatch Dialog */}
      <Dialog open={isDispatchOpen} onOpenChange={setIsDispatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispatch Shipment</DialogTitle>
            <DialogDescription>Enter delivery details to notify the buyer and admin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <Input id="date" type="date" className="col-span-3" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vehicle" className="text-right">Vehicle/Staff</Label>
              <Input id="vehicle" placeholder="Driver name / Vehicle #" className="col-span-3" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notes</Label>
              <Input id="notes" placeholder="Optional comments" className="col-span-3" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDispatchOpen(false)}>Cancel</Button>
            <Button onClick={handleDispatchSubmit}>Confirm Dispatch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
