import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/supabaseClient", () => ({
  supabase: {},
}));

vi.mock("@/hooks/lib/useSupabaseMutation", () => ({
  useSupabaseMutation: vi.fn(),
}));

vi.mock("@/hooks/lib/useSupabaseQuery", () => ({
  useSupabaseQuery: vi.fn(),
}));

import {
  buildPlantationEvidencePath,
  buildPlantationTaskStatusUpdate,
  mapPlantationPlan,
  mapPlantationTask,
  mapPlantationZone,
} from "@/hooks/usePlantation";
import {
  canManagePlantation,
  canUpdatePlantationTask,
  getPlantationStats,
  getPlantationTaskBuckets,
  getUnassignedPlantationPlans,
  groupPlantationPlansByZone,
  normalizePlantTypes,
  shouldShowPlantationPageLoader,
} from "@/app/(dashboard)/services/plantation/page-state";

const sampleZones = [
  {
    id: "zone-1",
    name: "Front Lawn",
    location_id: "loc-1",
    location_name: "Entrance",
    area_sqft: 1200,
    plant_types: ["Shrubs"],
    created_at: "2026-03-30T00:00:00.000Z",
  },
];

const samplePlans = [
  {
    id: "plan-1",
    zone_id: "zone-1",
    zone_name: "Front Lawn",
    season: "Summer 2026",
    plan_description: "Daily irrigation",
    start_date: "2026-04-01",
    end_date: "2026-06-30",
    status: "planned",
    created_by: "user-1",
    created_at: "2026-03-30T00:00:00.000Z",
  },
  {
    id: "plan-2",
    zone_id: null,
    zone_name: "Unassigned Zone",
    season: "Monsoon 2026",
    plan_description: "Fertilizer rotation",
    start_date: null,
    end_date: null,
    status: "planned",
    created_by: null,
    created_at: "2026-03-30T00:00:00.000Z",
  },
];

const sampleTasks = [
  {
    id: "task-1",
    plan_id: "plan-1",
    plan_season: "Summer 2026",
    zone_id: "zone-1",
    zone_name: "Front Lawn",
    task_name: "Water beds",
    task_type: "watering",
    assigned_to: "emp-1",
    assigned_to_name: "Alex Gardner",
    scheduled_date: "2026-04-01",
    completed_date: null,
    status: "pending" as const,
    notes: null,
    photo_evidence: [],
    created_at: "2026-03-30T00:00:00.000Z",
  },
  {
    id: "task-2",
    plan_id: null,
    plan_season: null,
    zone_id: "zone-1",
    zone_name: "Front Lawn",
    task_name: "Trim hedge",
    task_type: "pruning",
    assigned_to: "emp-2",
    assigned_to_name: "Jamie Green",
    scheduled_date: "2026-04-02",
    completed_date: null,
    status: "in_progress" as const,
    notes: null,
    photo_evidence: [],
    created_at: "2026-03-30T00:00:00.000Z",
  },
  {
    id: "task-3",
    plan_id: null,
    plan_season: null,
    zone_id: null,
    zone_name: "Unassigned Zone",
    task_name: "Close drip check",
    task_type: "inspection",
    assigned_to: "emp-3",
    assigned_to_name: "Taylor Moss",
    scheduled_date: "2026-04-03",
    completed_date: "2026-04-03",
    status: "completed" as const,
    notes: null,
    photo_evidence: ["https://example.com/evidence.jpg"],
    created_at: "2026-03-30T00:00:00.000Z",
  },
];

describe("plantation hook helpers", () => {
  it("normalizes horticulture rows into hook-friendly view models", () => {
    expect(
      mapPlantationZone({
        id: "zone-1",
        name: "Front Lawn",
        location_id: "loc-1",
        area_sqft: "1250.5",
        plant_types: ["Shrubs", "", "Palms"],
        created_at: "2026-03-30T00:00:00.000Z",
        location: [{ location_name: "Entrance" }],
      })
    ).toEqual({
      id: "zone-1",
      name: "Front Lawn",
      location_id: "loc-1",
      location_name: "Entrance",
      area_sqft: 1250.5,
      plant_types: ["Shrubs", "Palms"],
      created_at: "2026-03-30T00:00:00.000Z",
    });

    expect(
      mapPlantationPlan({
        id: "plan-1",
        zone_id: null,
        season: null,
        plan_description: null,
        start_date: null,
        end_date: null,
        status: null,
        created_by: null,
        created_at: null,
        zone: null,
      })
    ).toEqual({
      id: "plan-1",
      zone_id: null,
      zone_name: "Unassigned Zone",
      season: "General",
      plan_description: "",
      start_date: null,
      end_date: null,
      status: "planned",
      created_by: null,
      created_at: null,
    });

    expect(
      mapPlantationTask({
        id: "task-1",
        plan_id: "plan-1",
        zone_id: null,
        task_name: null,
        task_type: null,
        assigned_to: "emp-1",
        scheduled_date: null,
        completed_date: null,
        status: null,
        notes: null,
        photo_evidence: ["https://example.com/one.jpg", ""],
        created_at: null,
        zone: null,
        plan: [{ season: "Summer 2026" }],
        assignee: [{ first_name: "Alex", last_name: "Gardner" }],
      })
    ).toEqual({
      id: "task-1",
      plan_id: "plan-1",
      plan_season: "Summer 2026",
      zone_id: null,
      zone_name: "Unassigned Zone",
      task_name: "Untitled Task",
      task_type: "general",
      assigned_to: "emp-1",
      assigned_to_name: "Alex Gardner",
      scheduled_date: null,
      completed_date: null,
      status: "pending",
      notes: null,
      photo_evidence: ["https://example.com/one.jpg"],
      created_at: null,
    });
  });

  it("builds deterministic task status payloads and evidence paths", () => {
    expect(
      buildPlantationTaskStatusUpdate("completed", new Date("2026-03-30T10:15:00.000Z"))
    ).toEqual({
      status: "completed",
      completed_date: "2026-03-30",
    });

    expect(buildPlantationTaskStatusUpdate("in_progress", new Date("2026-03-30T10:15:00.000Z"))).toEqual({
      status: "in_progress",
      completed_date: null,
    });

    expect(
      buildPlantationEvidencePath("task-1", "before shot (1).png", 1700000000000)
    ).toBe("plantation/task-1/1700000000000_before_shot__1_.png");
  });
});

describe("plantation page state helpers", () => {
  it("normalizes plant type input and computes grouped board state", () => {
    expect(normalizePlantTypes(" Shrubs, , Palms , Flowering plants ")).toEqual([
      "Shrubs",
      "Palms",
      "Flowering plants",
    ]);

    expect(groupPlantationPlansByZone(sampleZones, samplePlans)).toEqual([
      {
        zone: sampleZones[0],
        plans: [samplePlans[0]],
      },
    ]);

    expect(getUnassignedPlantationPlans(samplePlans)).toEqual([samplePlans[1]]);
  });

  it("splits tasks into board columns and summarizes dashboard stats", () => {
    expect(getPlantationTaskBuckets(sampleTasks)).toEqual({
      pendingTasks: [sampleTasks[0]],
      inProgressTasks: [sampleTasks[1]],
      completedTasks: [sampleTasks[2]],
    });

    expect(getPlantationStats(sampleZones, samplePlans, sampleTasks)).toEqual([
      { label: "Zones", value: 1, detail: "Active plantation zones" },
      { label: "Seasonal Plans", value: 2, detail: "Planned cycles" },
      { label: "Pending Tasks", value: 1, detail: "Awaiting action" },
      { label: "Completed Tasks", value: 1, detail: "Closed tasks" },
    ]);
  });

  it("keeps management and technician update permissions scoped to the task owner", () => {
    expect(canManagePlantation("site_supervisor")).toBe(true);
    expect(canManagePlantation("pest_control_technician")).toBe(false);

    expect(canUpdatePlantationTask(sampleTasks[0], "admin", null)).toBe(true);
    expect(canUpdatePlantationTask(sampleTasks[0], "pest_control_technician", "emp-1")).toBe(true);
    expect(canUpdatePlantationTask(sampleTasks[0], "pest_control_technician", "emp-9")).toBe(false);
    expect(canUpdatePlantationTask(sampleTasks[0], "service_boy", "emp-1")).toBe(false);
  });

  it("shows the page loader only while auth or data are still empty", () => {
    expect(
      shouldShowPlantationPageLoader({
        isLoading: true,
        isAuthLoading: false,
        zones: [],
        plans: [],
        tasks: [],
      })
    ).toBe(true);

    expect(
      shouldShowPlantationPageLoader({
        isLoading: true,
        isAuthLoading: false,
        zones: sampleZones,
        plans: [],
        tasks: [],
      })
    ).toBe(false);

    expect(
      shouldShowPlantationPageLoader({
        isLoading: false,
        isAuthLoading: false,
        zones: [],
        plans: [],
        tasks: [],
      })
    ).toBe(false);
  });
});
