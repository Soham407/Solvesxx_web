"use client";

import { AssetCategoryManager } from "@/components/assets/AssetCategoryManager";
import { PageHeader } from "@/components/shared/PageHeader";

export default function AssetCategoriesPage() {
  return (
    <div className="flex-1 space-y-6 p-8">
      <PageHeader
        title="Asset Categories"
        description="Manage categories and organize your assets"
      />
      <AssetCategoryManager />
    </div>
  );
}
