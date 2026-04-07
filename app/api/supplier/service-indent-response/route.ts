import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const AcceptServiceIndentSchema = z.object({
  requestId: z.string().uuid(),
});

type SupplierUserRecord = {
  supplier_id?: string | null;
  roles?: { role_name?: string | null } | Array<{ role_name?: string | null }> | null;
};

function getRoleName(userRecord: SupplierUserRecord | null): string | null {
  const roleRecord = Array.isArray(userRecord?.roles)
    ? userRecord?.roles[0]
    : userRecord?.roles;

  return roleRecord?.role_name ?? null;
}

function calculateServiceEndDate(startDate?: string | null, durationMonths?: number | null) {
  if (!startDate || !durationMonths || durationMonths <= 0) {
    return null;
  }

  const nextDate = new Date(startDate);
  nextDate.setMonth(nextDate.getMonth() + durationMonths);
  return nextDate.toISOString().slice(0, 10);
}

async function advanceRequestWorkflowStatus(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  requestId: string,
  currentStatus: string,
  updatedAt: string
) {
  let nextStatus = currentStatus;

  if (nextStatus === "indent_forwarded") {
    const { error: acceptError } = await supabaseAdmin
      .from("requests")
      .update({
        status: "indent_accepted",
        rejection_reason: null,
        rejected_at: null,
        rejected_by: null,
        updated_at: updatedAt,
      })
      .eq("id", requestId);

    if (acceptError) {
      throw acceptError;
    }

    nextStatus = "indent_accepted";
  }

  if (nextStatus === "indent_accepted") {
    const { error: issueError } = await supabaseAdmin
      .from("requests")
      .update({
        status: "po_issued",
        rejection_reason: null,
        rejected_at: null,
        rejected_by: null,
        updated_at: updatedAt,
      })
      .eq("id", requestId);

    if (issueError) {
      throw issueError;
    }

    nextStatus = "po_issued";
  }

  return nextStatus;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const supabaseAdmin = createServiceRoleClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = AcceptServiceIndentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 }
      );
    }

    const { data: userRecord, error: userError } = await supabaseAdmin
      .from("users")
      .select("supplier_id, roles(role_name)")
      .eq("id", user.id)
      .maybeSingle();

    if (userError || !userRecord) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supplierId = (userRecord as SupplierUserRecord).supplier_id ?? null;
    const roleName = getRoleName(userRecord as SupplierUserRecord);
    if (!supplierId || !roleName || !["supplier", "vendor"].includes(roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: targetRequest, error: requestError } = await supabaseAdmin
      .from("requests")
      .select(`
        id,
        request_number,
        supplier_id,
        status,
        indent_id,
        is_service_request,
        service_type,
        service_grade,
        headcount,
        shift,
        start_date,
        duration_months,
        title,
        description
      `)
      .eq("id", parsed.data.requestId)
      .maybeSingle();

    if (requestError || !targetRequest) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }

    if (targetRequest.supplier_id !== supplierId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (targetRequest.is_service_request !== true) {
      return NextResponse.json({ error: "Only service deployment requests can use this flow." }, { status: 400 });
    }

    if (!targetRequest.service_type) {
      return NextResponse.json(
        { error: "Service deployment requests must include a service type before the supplier can accept them." },
        { status: 400 }
      );
    }

    if (!targetRequest.indent_id) {
      return NextResponse.json({ error: "Request is not linked to an approved service indent." }, { status: 400 });
    }

    if (!["indent_forwarded", "indent_accepted", "po_issued"].includes(targetRequest.status)) {
      return NextResponse.json(
        { error: `Cannot accept service request from status: ${targetRequest.status}` },
        { status: 409 }
      );
    }

    const { data: linkedIndent, error: indentError } = await supabaseAdmin
      .from("indents")
      .select("id, status, supplier_id, service_request_id")
      .eq("id", targetRequest.indent_id)
      .maybeSingle();

    if (indentError || !linkedIndent) {
      return NextResponse.json({ error: "Linked service indent not found." }, { status: 404 });
    }

    if (
      linkedIndent.supplier_id !== supplierId ||
      linkedIndent.service_request_id !== targetRequest.id ||
      !["approved", "po_created"].includes(linkedIndent.status)
    ) {
      return NextResponse.json(
        { error: "Only approved supplier-assigned service indents can be accepted." },
        { status: 409 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: activeRate, error: activeRateError } = await supabaseAdmin
      .from("service_rates")
      .select("rate")
      .eq("supplier_id", supplierId)
      .eq("service_type", targetRequest.service_type)
      .eq("is_active", true)
      .lte("effective_from", today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeRateError) {
      throw activeRateError;
    }
    if (!activeRate) {
      return NextResponse.json(
        { error: "No active service rate contract found for this supplier and service type." },
        { status: 409 }
      );
    }

    const serviceHeadcount = Math.max(targetRequest.headcount ?? 1, 1);
    const unitPrice = Number(activeRate.rate ?? 0);
    const lineTotal = unitPrice * serviceHeadcount;

    let spo =
      (
        await supabaseAdmin
          .from("service_purchase_orders")
          .select("id, status, total_amount")
          .eq("request_id", targetRequest.id)
          .eq("vendor_id", supplierId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data ?? null;
    const reusedExistingOrder = Boolean(spo);

    if (!spo) {
      const { data: createdSpo, error: spoError } = await supabaseAdmin
        .from("service_purchase_orders")
        .insert({
          vendor_id: supplierId,
          request_id: targetRequest.id,
          indent_id: targetRequest.indent_id,
          spo_number: "",
          service_type: targetRequest.service_type,
          description:
            targetRequest.description ??
            `Service Deployment: ${targetRequest.service_type ?? targetRequest.title}`,
          start_date: targetRequest.start_date ?? new Date().toISOString(),
          end_date: calculateServiceEndDate(targetRequest.start_date, targetRequest.duration_months),
          total_amount: lineTotal,
          status: "sent_to_vendor",
          created_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .select("id, status, total_amount")
        .single();

      if (spoError || !createdSpo) {
        throw spoError;
      }

      spo = createdSpo;
    }

    const { data: existingItem, error: itemLookupError } = await supabaseAdmin
      .from("service_purchase_order_items")
      .select("id")
      .eq("spo_id", spo.id)
      .limit(1)
      .maybeSingle();

    if (itemLookupError) {
      throw itemLookupError;
    }

    if (!existingItem) {
      const { error: itemError } = await supabaseAdmin
        .from("service_purchase_order_items")
        .insert({
          spo_id: spo.id,
          service_description:
            [targetRequest.service_type, targetRequest.service_grade].filter(Boolean).join(" - ") ||
            targetRequest.title ||
            "Service deployment",
          quantity: serviceHeadcount,
          unit: "headcount",
          unit_price: unitPrice,
          line_total: lineTotal,
          notes:
            [
              targetRequest.shift ? `Shift: ${targetRequest.shift}` : null,
              targetRequest.duration_months
                ? `Duration: ${targetRequest.duration_months} month(s)`
                : null,
            ]
              .filter(Boolean)
              .join(" | ") || null,
        });

      if (itemError) {
        throw itemError;
      }
    }

    if (spo.total_amount !== lineTotal) {
      const { error: updateSpoError } = await supabaseAdmin
        .from("service_purchase_orders")
        .update({ total_amount: lineTotal, updated_at: new Date().toISOString() })
        .eq("id", spo.id);

      if (updateSpoError) {
        throw updateSpoError;
      }
    }

    const finalRequestStatus = await advanceRequestWorkflowStatus(
      supabaseAdmin,
      targetRequest.id,
      targetRequest.status,
      new Date().toISOString()
    );

    return NextResponse.json({
      success: true,
      servicePurchaseOrderId: spo.id,
      reusedExistingOrder,
      requestStatus: finalRequestStatus,
    });
  } catch (error: unknown) {
    console.error("Service indent acceptance error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept service indent" },
      { status: 500 }
    );
  }
}
