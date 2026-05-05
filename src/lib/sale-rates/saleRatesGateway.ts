import { supabase } from "@/src/lib/supabaseClient";
import type { SaleProductRateRow } from "@/src/lib/sale-rates/saleProductRateTransforms";

type RateUpdateBuilder = PromiseLike<unknown> & {
  eq(column: string, value: unknown): RateUpdateBuilder;
  is(column: string, value: unknown): RateUpdateBuilder;
  select(): {
    single(): Promise<{ data: SaleProductRateRow | null; error: unknown }>;
  };
};

type SaleRatesQuery = PromiseLike<{
  data: SaleProductRateRow[] | null;
  error: unknown;
  count: number | null;
}> & {
  eq(column: string, value: unknown): SaleRatesQuery;
  is(column: string, value: unknown): SaleRatesQuery;
  lte(column: string, value: unknown): SaleRatesQuery;
  or(filter: string): SaleRatesQuery;
  order(column: string, options?: { ascending?: boolean }): SaleRatesQuery;
  limit(count: number): SaleRatesQuery;
};

type SaleRatesClient = {
  from(table: "sale_product_rates"): {
    select(columns: string): SaleRatesQuery;
    update(values: Record<string, unknown>): RateUpdateBuilder;
    insert(values: Record<string, unknown>): {
      select(): {
        single(): Promise<{ data: SaleProductRateRow | null; error: unknown }>;
      };
    };
  };
};

const saleRatesClient = supabase as unknown as SaleRatesClient;

function normalizeSaleRateRows(rows: unknown): SaleProductRateRow[] {
  return Array.isArray(rows) ? (rows as SaleProductRateRow[]) : [];
}

export async function fetchSaleRateRows(filters: {
  product_id?: string;
  society_id?: string | null;
  is_active?: boolean;
  effective_as_of?: string;
}): Promise<{ rows: SaleProductRateRow[]; count: number | null }> {
  let query = saleRatesClient
    .from("sale_product_rates")
    .select("*")
    .order("effective_from", { ascending: false });

  if (filters.product_id) query = query.eq("product_id", filters.product_id);
  if (filters.society_id === null) query = query.is("society_id", null);
  else if (filters.society_id) query = query.eq("society_id", filters.society_id);
  if (filters.is_active !== undefined) query = query.eq("is_active", filters.is_active);
  if (filters.effective_as_of) {
    query = query
      .lte("effective_from", filters.effective_as_of)
      .or(`effective_to.is.null,effective_to.gte.${filters.effective_as_of}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: normalizeSaleRateRows(data), count };
}

export async function expireActiveSaleRate(
  productId: string,
  societyId: string | null,
  effectiveTo: string
): Promise<void> {
  let query = saleRatesClient
    .from("sale_product_rates")
    .update({
      effective_to: effectiveTo,
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", productId)
    .eq("is_active", true)
    .is("effective_to", null);

  if (societyId === null) {
    await query.is("society_id", null);
  } else {
    await query.eq("society_id", societyId);
  }
}

export async function findLatestSaleRate(
  productId: string,
  societyId: string | null,
  dateStr: string
): Promise<SaleProductRateRow | null> {
  let query = saleRatesClient
    .from("sale_product_rates")
    .select("*")
    .eq("product_id", productId)
    .eq("is_active", true)
    .lte("effective_from", dateStr)
    .or(`effective_to.is.null,effective_to.gte.${dateStr}`)
    .order("effective_from", { ascending: false })
    .limit(1);

  if (societyId === null) query = query.is("society_id", null);
  else query = query.eq("society_id", societyId);

  const { data, error } = await query;
  if (error) throw error;
  return normalizeSaleRateRows(data)[0] ?? null;
}

export async function fetchRateHistory(
  productId: string,
  societyId?: string | null
): Promise<SaleProductRateRow[]> {
  let query = saleRatesClient
    .from("sale_product_rates")
    .select("*")
    .eq("product_id", productId)
    .order("effective_from", { ascending: false });

  if (societyId === null) query = query.is("society_id", null);
  else if (societyId) query = query.eq("society_id", societyId);

  const { data, error } = await query;
  if (error) throw error;
  return normalizeSaleRateRows(data);
}

export async function fetchGlobalSaleRates(): Promise<SaleProductRateRow[]> {
  const { data, error } = await saleRatesClient
    .from("sale_product_rates")
    .select("*")
    .is("society_id", null)
    .eq("is_active", true)
    .order("product_id");

  if (error) throw error;
  return normalizeSaleRateRows(data);
}

export async function fetchSocietySaleRates(societyId: string): Promise<SaleProductRateRow[]> {
  const { data, error } = await saleRatesClient
    .from("sale_product_rates")
    .select("*")
    .eq("society_id", societyId)
    .eq("is_active", true)
    .order("product_id");

  if (error) throw error;
  return normalizeSaleRateRows(data);
}

export async function insertSaleRate(values: Record<string, unknown>): Promise<SaleProductRateRow> {
  const { data, error } = await saleRatesClient
    .from("sale_product_rates")
    .insert(values)
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to insert sale rate");
  return data;
}

export async function updateSaleRate(
  rateId: string,
  values: Record<string, unknown>
): Promise<SaleProductRateRow> {
  const { data, error } = await saleRatesClient
    .from("sale_product_rates")
    .update(values)
    .eq("id", rateId)
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to update sale rate");
  return data;
}
