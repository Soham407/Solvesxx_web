"use client";

import { DeliveryDashboard } from "@/components/dashboards/DeliveryDashboard";

export default function TestDeliveryPage() {
  return (
    <div className="p-6">
      <div className="mb-6 p-4 bg-info/10 border-l-4 border-info rounded">
        <h2 className="text-lg font-bold text-info mb-2">🚚 Delivery Truth Engine Test Page</h2>
        <div className="text-sm space-y-1">
          <p><strong>Phase E: Operation Truth - Day 1</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-1 text-muted-foreground">
            <li><strong>Material Arrival:</strong> Mandatory photo & vehicle log for Purchase Orders.</li>
            <li><strong>Hard Constraint:</strong> Cannot log without a Supabase-hosted photo URL.</li>
            <li><strong>Database Enforcement:</strong> Checked via <code>log_material_arrival</code> RPC.</li>
          </ul>
        </div>
      </div>
      <DeliveryDashboard />
    </div>
  );
}
