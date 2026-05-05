import type { Json } from "@/src/types/supabase";
import type { RTVDashboardStats, RTVTicketDisplay } from "@/src/types/operations";

export type RTVTicketRow = {
  id: string;
  rtv_number: string;
  po_id: string | null;
  supplier_id: string;
  product_id: string;
  receipt_id: string | null;
  return_reason: string;
  quantity: number;
  unit_of_measurement: string | null;
  estimated_value: number | null;
  notes: string | null;
  status: string | null;
  raised_by: string | null;
  created_at: string | null;
  dispatched_at: string | null;
  accepted_at: string | null;
  credit_issued_at: string | null;
  photo_urls: Json | null;
  supplier?: { supplier_name?: string | null } | null;
  product?: { product_name?: string | null } | null;
  purchase_order?: { po_number?: string | null } | null;
};

export function mapRTVTicketRow(ticket: RTVTicketRow): RTVTicketDisplay {
  return {
    id: ticket.id,
    rtv_number: ticket.rtv_number,
    po_id: ticket.po_id,
    supplier_id: ticket.supplier_id,
    product_id: ticket.product_id,
    receipt_id: ticket.receipt_id,
    return_reason: ticket.return_reason,
    quantity: ticket.quantity,
    unit_of_measurement: ticket.unit_of_measurement,
    estimated_value: ticket.estimated_value,
    notes: ticket.notes,
    photo_urls: ticket.photo_urls,
    raised_by: ticket.raised_by,
    status: ticket.status,
    created_at: ticket.created_at || new Date().toISOString(),
    updated_at: ticket.created_at || new Date().toISOString(),
    accepted_at: ticket.accepted_at,
    dispatched_at: ticket.dispatched_at,
    credit_issued_at: ticket.credit_issued_at,
    credit_note_amount: null,
    credit_note_number: null,
    supplier: ticket.supplier?.supplier_name
      ? { supplier_name: ticket.supplier.supplier_name }
      : undefined,
    product: ticket.product?.product_name
      ? { product_name: ticket.product.product_name }
      : undefined,
    purchase_order: ticket.purchase_order?.po_number
      ? { po_number: ticket.purchase_order.po_number }
      : undefined,
  };
}

export function buildRTVDashboardStats(
  tickets: RTVTicketDisplay[],
  now = new Date(),
): RTVDashboardStats {
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let pendingPickup = 0;
  let inTransit = 0;
  let creditPendingValue = 0;
  let monthlyReturnsCount = 0;

  tickets.forEach((ticket) => {
    if (ticket.status === "pending_dispatch") pendingPickup++;
    if (ticket.status === "in_transit") inTransit++;
    if (ticket.status !== "credit_note_issued") {
      creditPendingValue += Number(ticket.estimated_value || 0);
    }

    const createdAt = new Date(ticket.created_at);
    if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) {
      monthlyReturnsCount++;
    }
  });

  return {
    pendingPickup,
    inTransit,
    creditPendingValue,
    monthlyReturnsCount,
  };
}
