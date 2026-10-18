export type Priority = 'low' | 'normal' | 'high';

export type Category = {
  id: number;
  sourceId: string | null;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  seeded: boolean;
};

export type Task = {
  id: number;
  sourceKey: string | null;
  title: string;
  notes: string | null;
  categoryId: number | null;
  isComplete: boolean;
  completedAt: string | null;
  priority: Priority;
  dueDate: string | null;
  reminderAt: string | null;
  reminderId: string | null;
  isTopPriority: boolean;
  scheduledDate: string | null;
  createdAt: string;
  updatedAt: string;
  categoryName: string;
  categoryColor: string;
  sortOrder: number;
};

export type TaskInput = Pick<Task, 'title'> & { categoryId: number | null } & Partial<Pick<Task, 'notes' | 'priority' | 'dueDate' | 'reminderAt' | 'isTopPriority' | 'scheduledDate'>>;

export type StarterBundle = {
  version?: number;
  categories: Array<{ id: string | number; name: string; color?: string; icon?: string; sortOrder?: number; tasks: Array<{
    id?: string | number;
    title: string;
    completed?: boolean;
    priority?: string;
    dueAt?: string | null;
    reminderAt?: string | null;
    sortOrder?: number;
    notes?: string | null;
    dueDate?: string | null;
  }> }>;
};
