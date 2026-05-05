export interface ProductCategory {
  id: string;
  category_name: string;
  category_code: string | null;
  description: string | null;
  is_active: boolean;
  parent_category_id: string | null;
  itemCount: number;
}

export interface CreateProductCategoryDTO {
  category_name: string;
  category_code?: string;
  description?: string;
  parent_category_id?: string;
}

export interface UpdateProductCategoryDTO {
  category_name?: string;
  category_code?: string;
  description?: string;
  parent_category_id?: string | null;
  is_active?: boolean;
}

export type ProductCategoryRow = {
  id: string;
  category_name: string;
  category_code: string | null;
  description: string | null;
  is_active: boolean | null;
  parent_category_id: string | null;
};

export type ProductRow = {
  category_id: string | null;
};

export function buildProductCategoryItemCounts(products: ProductRow[]) {
  const counts = new Map<string, number>();

  for (const product of products) {
    if (!product.category_id) continue;
    counts.set(product.category_id, (counts.get(product.category_id) || 0) + 1);
  }

  return counts;
}

export function mapProductCategoryRow(
  category: ProductCategoryRow,
  itemCount: number
): ProductCategory {
  return {
    id: category.id,
    category_name: category.category_name,
    category_code: category.category_code,
    description: category.description,
    is_active: category.is_active !== false,
    parent_category_id: category.parent_category_id,
    itemCount,
  };
}

export function mapProductCategoryRows(
  categories: ProductCategoryRow[],
  itemCounts: Map<string, number>
): ProductCategory[] {
  return categories.map((category) =>
    mapProductCategoryRow(category, itemCounts.get(category.id) || 0)
  );
}
