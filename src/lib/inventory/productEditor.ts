export interface ProductFormData {
  product_code: string;
  product_name: string;
  category_id: string;
  subcategory_id: string;
  unit_of_measurement: string;
  base_rate: string;
  min_stock_level: string;
  current_stock: string;
  description: string;
  hsn_code: string;
  tax_rate: string;
}

export const EMPTY_PRODUCT_FORM: ProductFormData = {
  product_code: "",
  product_name: "",
  category_id: "",
  subcategory_id: "",
  unit_of_measurement: "",
  base_rate: "",
  min_stock_level: "10",
  current_stock: "0",
  description: "",
  hsn_code: "",
  tax_rate: "",
};

export interface ProductEditorSource {
  product_code?: string | null;
  product_name?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  unit_of_measurement?: string | null;
  base_rate?: number | string | null;
  min_stock_level?: number | string | null;
  current_stock?: number | string | null;
  description?: string | null;
  hsn_code?: string | null;
  tax_rate?: number | string | null;
}

export const buildProductFormFromProduct = (product: ProductEditorSource): ProductFormData => ({
  product_code: product.product_code || "",
  product_name: product.product_name || "",
  category_id: product.category_id || "",
  subcategory_id: product.subcategory_id || "",
  unit_of_measurement: product.unit_of_measurement || "",
  base_rate: product.base_rate?.toString() || "",
  min_stock_level: product.min_stock_level?.toString() || "0",
  current_stock: product.current_stock?.toString() || "0",
  description: product.description || "",
  hsn_code: product.hsn_code || "",
  tax_rate: product.tax_rate?.toString() || "",
});

export const validateProductForm = (form: ProductFormData): string | null => {
  if (!form.product_name.trim()) {
    return "Product name is required";
  }
  if (!form.product_code.trim()) {
    return "Product code is required";
  }
  return null;
};

export const buildProductPayload = (form: ProductFormData) => ({
  product_code: form.product_code.trim(),
  product_name: form.product_name.trim(),
  category_id: form.category_id || undefined,
  subcategory_id: form.subcategory_id || undefined,
  unit_of_measurement: form.unit_of_measurement || undefined,
  base_rate: form.base_rate ? Number(form.base_rate) : undefined,
  min_stock_level: form.min_stock_level ? Number(form.min_stock_level) : undefined,
  current_stock: form.current_stock ? Number(form.current_stock) : undefined,
  description: form.description || undefined,
  hsn_code: form.hsn_code || undefined,
  tax_rate: form.tax_rate ? Number(form.tax_rate) : undefined,
});

export const formatProductCurrency = (amount: number | null): string => {
  if (amount === null) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
};
