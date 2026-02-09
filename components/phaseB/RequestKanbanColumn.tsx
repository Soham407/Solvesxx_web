"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface RequestKanbanColumnProps {
  id: string;
  title: string;
  color: string;
  headerColor: string;
  count: number;
  icon: LucideIcon;
  children: React.ReactNode;
}

export function RequestKanbanColumn({
  id,
  title,
  color,
  headerColor,
  count,
  icon: Icon,
  children,
}: RequestKanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-80 flex flex-col rounded-lg border-2 transition-colors",
        color,
        isOver ? "border-primary ring-2 ring-primary/20" : ""
      )}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-inherit">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", headerColor)} />
            <h3 className={cn("font-semibold", headerColor)}>{title}</h3>
          </div>
          <span
            className={cn(
              "text-sm font-medium px-2 py-1 rounded-full",
              "bg-white/50"
            )}
          >
            {count}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-3 overflow-y-auto min-h-[400px] max-h-[calc(100vh-300px)]">
        {children}
      </div>
    </div>
  );
}
