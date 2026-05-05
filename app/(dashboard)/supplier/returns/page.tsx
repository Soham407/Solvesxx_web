"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRTVTickets } from "@/hooks/useRTVTickets";
import { useSupplierPortal } from "@/hooks/useSupplierPortal";
import { RTV_STATUS_COLORS, RTV_STATUS_LABELS } from "@/src/lib/constants";
import type { RTVTicketDisplay } from "@/src/types/operations";

function statusClassName(status?: string | null) {
  const color = RTV_STATUS_COLORS[status || "pending_dispatch"];

  if (color === "text-success") return "bg-success/10 text-success border-success/20";
  if (color === "text-primary") return "bg-primary/10 text-primary border-primary/20";
  if (color === "text-warning") return "bg-warning/10 text-warning border-warning/20";
  if (color === "text-critical") return "bg-critical/10 text-critical border-critical/20";
  if (color === "text-info") return "bg-info/10 text-info border-info/20";

  return "bg-muted text-muted-foreground";
}

export default function SupplierReturnsPage() {
  const { supplierId } = useSupplierPortal();
  const { tickets, isLoading, updateStatus } = useRTVTickets();

  const supplierTickets = useMemo(
    () => tickets.filter((ticket) => !supplierId || ticket.supplier_id === supplierId),
    [tickets, supplierId]
  );

  const updateTicketStatus = async (ticket: RTVTicketDisplay, nextStatus: string) => {
    await updateStatus(ticket.id, nextStatus);
  };

  const columns: ColumnDef<RTVTicketDisplay>[] = [
    {
      accessorKey: "rtv_number",
      header: "Return #",
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.rtv_number}</span>,
    },
    {
      accessorKey: "po_id",
      header: "PO",
      cell: ({ row }) => <span>{row.original.purchase_order?.po_number || "-"}</span>,
    },
    {
      accessorKey: "product",
      header: "Product",
      cell: ({ row }) => <span>{row.original.product?.product_name || "Unknown product"}</span>,
      filterFn: (row, _id, value) => {
        const productName = row.original.product?.product_name || "";
        return productName.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      accessorKey: "status",
      header: "Return status",
      cell: ({ row }) => {
        const status = row.original.status || "pending_dispatch";
        return (
          <Badge variant="outline" className={statusClassName(status)}>
            {RTV_STATUS_LABELS[status] || status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const ticket = row.original;

        if (ticket.status === "in_transit") {
          return (
            <Button size="sm" variant="outline" onClick={() => updateTicketStatus(ticket, "accepted_by_vendor")}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Receipt
            </Button>
          );
        }

        if (ticket.status === "accepted_by_vendor") {
          return (
            <Button size="sm" onClick={() => updateTicketStatus(ticket, "credit_note_issued")}>
              <RotateCcw className="mr-2 h-4 w-4" /> Issue Credit Note
            </Button>
          );
        }

        if (ticket.status === "pending_dispatch") {
          return (
            <Button size="sm" variant="secondary" onClick={() => updateTicketStatus(ticket, "in_transit")}>
              <ArrowRight className="mr-2 h-4 w-4" /> Mark In Transit
            </Button>
          );
        }

        return <span className="text-xs text-muted-foreground">No action</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Returns"
        description="Handle return tickets raised against your fulfilled purchase orders."
      />

      <DataTable columns={columns} data={supplierTickets} searchKey="product" isLoading={isLoading} />
    </div>
  );
}
