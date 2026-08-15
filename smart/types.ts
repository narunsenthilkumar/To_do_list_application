import { PriorityLevel, RecurrenceRule, ReminderOption } from '../models/task';

export interface ParserConfidence {
  title: number;
  date: number;
  time: number;
  priority: number;
  recurrence: number;
  category: number;
  overall: number;
}

export interface ParsedDateResult {
  dateStr?: string; // YYYY-MM-DD
  matchedText: string;
  confidence: number;
}

export interface ParsedTimeResult {
  timeStr?: string; // HH:mm
  matchedText: string;
  confidence: number;
}

export interface ParsedRecurrenceResult {
  rule?: RecurrenceRule;
  matchedText: string;
  confidence: number;
}

export interface ParsedPriorityResult {
  priority: PriorityLevel;
  matchedText: string;
  confidence: number;
}

export interface CategoryResult {
  primary: string;
  icon: string;
  secondary?: string;
  confidence: number;
  matchedKeywords: string[];
}

export interface ReminderRecommendation {
  suggestedOption: ReminderOption;
  label: string;
  reason: string;
}

export interface ParsedTask {
  rawInput: string;
  title: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: PriorityLevel;
  recurrence?: RecurrenceRule;
  category?: string;
  categoryIcon?: string;
  estimatedDuration?: number; // minutes
  reminder?: ReminderOption;
  confidence: ParserConfidence;
  hasMatchedDate: boolean;
  hasMatchedTime: boolean;
}

export interface ScheduleRecommendation {
  taskId?: string;
  taskTitle: string;
  suggestedDate: string;
  suggestedTime?: string;
  reason: string;
  score: number;
  workloadStatus: 'light' | 'optimal' | 'busy' | 'overloaded';
}

export type SuggestionType =
  | 'morning_summary'
  | 'evening_summary'
  | 'workload_warning'
  | 'high_priority'
  | 'habit_insight'
  | 'streak_praise'
  | 'overdue_review'
  | 'focus_recommendation';

export interface SmartSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  actionLabel?: string;
  actionType?: 'view_plan' | 'reschedule' | 'start_focus' | 'review_overdue' | 'move_today' | 'dismiss';
  data?: any;
  priorityScore: number;
  timestamp: string;
}

export interface SmartSettings {
  smartParsingEnabled: boolean;
  smartSchedulingEnabled: boolean;
  smartCategorizationEnabled: boolean;
  smartRemindersEnabled: boolean;
  productivityTipsEnabled: boolean;
  voiceTasksEnabled: boolean;
}

export const DEFAULT_SMART_SETTINGS: SmartSettings = {
  smartParsingEnabled: true,
  smartSchedulingEnabled: true,
  smartCategorizationEnabled: true,
  smartRemindersEnabled: true,
  productivityTipsEnabled: true,
  voiceTasksEnabled: true,
};
