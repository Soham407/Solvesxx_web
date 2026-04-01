import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/src/lib/platform/server";

export const runtime = "nodejs";

const SUPPORTED_RAZORPAY_EVENTS = new Set(["payment.captured", "payment.failed"]);

function verifyRazorpaySignature(rawBody: string, signature: string, secret: string) {
  const expectedSignature = createHmac("sha256", secret).update(rawBody).digest("hex");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function getReferenceTable(referenceType: string | null) {
  if (referenceType === "sale_bill") return "sale_bills";
  if (referenceType === "purchase_bill") return "purchase_bills";
  return null;
}

async function mirrorGatewayStateToBill(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  referenceType: string | null,
  referenceId: string | null,
  payload: {
    externalId: string;
    gatewayLog: Record<string, unknown>;
    failureReason: string | null;
  }
) {
  const table = getReferenceTable(referenceType);
  if (!table || !referenceId) {
    return;
  }

  const { error } = await supabaseAdmin
    .from(table as any)
    .update({
      external_id: payload.externalId,
      gateway_log: payload.gatewayLog,
      failure_reason: payload.failureReason,
    })
    .eq("id", referenceId);

  if (error) throw error;
}

async function settleReferenceBill(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  referenceType: string | null,
  referenceId: string | null,
  amount: number,
  paymentDate: string,
  gatewayPayload: {
    externalId: string;
    gatewayLog: Record<string, unknown>;
  }
) {
  const table = getReferenceTable(referenceType);
  if (!table || !referenceId) {
    return;
  }

  const { data: bill, error: billError } = await supabaseAdmin
    .from(table as any)
    .select("paid_amount, total_amount")
    .eq("id", referenceId)
    .single();

  if (billError) throw billError;

  const currentPaidAmount = bill?.paid_amount || 0;
  const totalAmount = bill?.total_amount || 0;
  const newPaidAmount = Math.min(currentPaidAmount + amount, totalAmount);
  const newDueAmount = Math.max(0, totalAmount - newPaidAmount);
  const nextPaymentStatus =
    newDueAmount === 0 ? "paid" : newPaidAmount > 0 ? "partial" : "unpaid";

  const { error: updateError } = await supabaseAdmin
    .from(table as any)
    .update({
      paid_amount: newPaidAmount,
      due_amount: newDueAmount,
      payment_status: nextPaymentStatus,
      last_payment_date: paymentDate,
      external_id: gatewayPayload.externalId,
      gateway_log: gatewayPayload.gatewayLog,
      failure_reason: null,
    })
    .eq("id", referenceId);

  if (updateError) throw updateError;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "RAZORPAY_WEBHOOK_SECRET is not configured." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-razorpay-signature header." },
      { status: 400 }
    );
  }

  const rawBody = await request.text();
  if (!verifyRazorpaySignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid webhook JSON payload." }, { status: 400 });
  }

  if (!SUPPORTED_RAZORPAY_EVENTS.has(payload?.event)) {
    return NextResponse.json(
      { received: true, ignored: true, event: payload?.event ?? null },
      { status: 202 }
    );
  }

  const paymentEntity = payload?.payload?.payment?.entity;
  if (!paymentEntity?.id) {
    return NextResponse.json(
      { error: "Webhook payload did not include payload.payment.entity.id." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = createServiceRoleClient();
    const { data: payment, error: paymentLookupError } = await supabaseAdmin
      .from("payments")
      .select("id, amount, status, reference_type, reference_id")
      .eq("external_id", paymentEntity.id)
      .maybeSingle();

    if (paymentLookupError) {
      return NextResponse.json({ error: paymentLookupError.message }, { status: 500 });
    }

    if (!payment) {
      return NextResponse.json(
        { error: `Payment not found for external_id ${paymentEntity.id}.` },
        { status: 404 }
      );
    }

    const nextStatus = payload.event === "payment.captured" ? "completed" : "failed";
    if (payment.status === "completed" && nextStatus !== "completed") {
      return NextResponse.json(
        { received: true, ignored: true, status: payment.status },
        { status: 202 }
      );
    }

    const paymentDate = paymentEntity.created_at
      ? new Date(paymentEntity.created_at * 1000).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    const failureReason =
      nextStatus === "failed"
        ? paymentEntity.error_description ||
          paymentEntity.error_reason ||
          "Razorpay reported the payment as failed."
        : null;
    const gatewayLog = payload as Record<string, unknown>;

    const { error: paymentUpdateError } = await supabaseAdmin
      .from("payments")
      .update({
        status: nextStatus,
        payment_date: paymentDate,
        external_id: paymentEntity.id,
        gateway_log: gatewayLog,
        failure_reason: failureReason,
      })
      .eq("id", payment.id);

    if (paymentUpdateError) {
      return NextResponse.json({ error: paymentUpdateError.message }, { status: 500 });
    }

    if (nextStatus === "completed" && payment.status !== "completed") {
      await settleReferenceBill(
        supabaseAdmin,
        payment.reference_type,
        payment.reference_id,
        Number(payment.amount || 0),
        paymentDate,
        {
          externalId: paymentEntity.id,
          gatewayLog,
        }
      );
    } else {
      await mirrorGatewayStateToBill(supabaseAdmin, payment.reference_type, payment.reference_id, {
        externalId: paymentEntity.id,
        gatewayLog,
        failureReason,
      });
    }

    return NextResponse.json({ received: true, status: nextStatus });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process payment webhook.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
