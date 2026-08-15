export type PriorityLevel = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export type RecurrenceFrequency = 'never' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // e.g., every 2 weeks
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  dayOfMonth?: number;
  endDate?: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: 'created' | 'updated' | 'rescheduled' | 'completed' | 'uncompleted' | 'reopened';
  timestamp: string;
  details?: string;
}

export type ReminderOption = 'none' | 'at_time' | '5m_before' | '15m_before' | '30m_before' | '1h_before' | '1d_before';

export interface Task {
  id: string;
  userId?: string;
  title: string;
  notes?: string;
  completed: boolean;
  isPinned?: boolean;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm format
  priority: PriorityLevel;
  projectId?: string;
  tags: string[];
  subtasks: Subtask[];
  reminder?: ReminderOption;
  notificationId?: string;
  recurrence?: RecurrenceRule;
  category?: string;
  estimatedDuration?: number; // duration in minutes (e.g. 15, 30, 45, 60)
  order: number;
  activityLogs: ActivityLog[];
  // Phase 4 Sync & Local-First Metadata
  version?: number;
  updatedByDeviceId?: string;
  deletedAt?: string;
}
