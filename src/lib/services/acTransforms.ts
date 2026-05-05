import type { Service } from "@/src/types/operations";
import type { ServiceRequestWithDetails } from "@/src/types/operations";
import type { StockLevel } from "@/src/types/operations";
import { ServiceCode } from "@/src/lib/service-codes";

const AC_TERMS = ["ac ", "filter", "gas", "refrigerant", "capacitor", "compressor", "copper pipe"];

export interface ACServiceStats {
  active: number;
  lowStock: number;
  avgTime: string;
  completed: number;
}

export const findAcService = (services: Service[]): Service | undefined => {
  return services.find(
    (service) =>
      service.service_code === ServiceCode.AC_REPAIR ||
      service.service_name?.toLowerCase().includes("air condition"),
  );
};

export const filterAcStockLevels = (stockLevels: StockLevel[]): StockLevel[] => {
  return stockLevels.filter((item) =>
    AC_TERMS.some(
      (term) =>
        item.product_name?.toLowerCase().includes(term) ||
        item.product_code?.toLowerCase().includes(term),
    ),
  );
};

export const buildAcServiceStats = (
  requests: ServiceRequestWithDetails[],
  stockLevels: StockLevel[],
): ACServiceStats => {
  return {
    active: requests.filter((request) => request.status === "in_progress" || request.status === "assigned").length,
    lowStock: stockLevels.filter((item) => item.needs_reorder).length,
    avgTime: "3.2h",
    completed: requests.filter((request) => request.status === "completed").length,
  };
};
