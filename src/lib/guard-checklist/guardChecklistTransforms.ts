export interface ChecklistItem {
  id: string;
  task: string;
  status: "pending" | "done";
  required: boolean;
  completedAt?: string;
  photos?: { photo_path: string; timestamp: string }[];
}

export interface ChecklistData {
  items: ChecklistItem[];
  totalItems: number;
  completedItems: number;
  checklistId: string | null;
  checklistName: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ShiftInfo {
  shiftName: string;
  startTime: string;
  endTime: string;
  isNightShift: boolean;
}

export type ChecklistQuestionRow = {
  id: string;
  question: string;
  required?: boolean | null;
};

export type ChecklistResponseMap = Record<
  string,
  {
    completed: boolean;
    completedAt?: string;
    photos?: { photo_path: string; timestamp: string }[];
    latitude?: number;
    longitude?: number;
  }
>;

export function buildChecklistItems(
  questions: ChecklistQuestionRow[],
  responses: ChecklistResponseMap,
): ChecklistItem[] {
  return questions.map((q) => {
    const responseData = responses[q.id];
    return {
      id: q.id,
      task: q.question,
      required: q.required || false,
      status: responseData?.completed ? "done" : "pending",
      completedAt: responseData?.completedAt,
      photos: responseData?.photos || [],
    };
  });
}

export function buildChecklistData(
  checklistId: string | null,
  checklistName: string | null,
  items: ChecklistItem[],
): ChecklistData {
  return {
    items,
    totalItems: items.length,
    completedItems: items.filter((item) => item.status === "done").length,
    checklistId,
    checklistName,
    isLoading: false,
    error: null,
  };
}

export function buildChecklistCompletionResponses(
  existingResponses: ChecklistResponseMap,
  itemId: string,
  coords?: { latitude: number; longitude: number },
  completedAt: string = new Date().toISOString()
) {
  const taskData = existingResponses[itemId] || { completed: false };

  return {
    ...existingResponses,
    [itemId]: {
      ...taskData,
      completed: true,
      completedAt,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    },
  };
}

export function buildChecklistEvidenceResponses(
  existingResponses: ChecklistResponseMap,
  itemId: string,
  photoPath: string,
  timestamp: string = new Date().toISOString()
) {
  const taskData = existingResponses[itemId] || { completed: false };
  const updatedPhotos = [...(taskData.photos || []), { photo_path: photoPath, timestamp }];

  return {
    ...existingResponses,
    [itemId]: { ...taskData, photos: updatedPhotos },
  };
}
