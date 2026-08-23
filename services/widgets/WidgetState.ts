import { PriorityLevel } from '../../models/task';
import { FocusModeType, FocusSessionStatus } from '../../models/focus';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetTaskItem {
  id: string;
  title: string;
  dueTime?: string;
  priority: PriorityLevel;
  projectName?: string;
  projectColor?: string;
  completed: boolean;
}

export interface WidgetFocusState {
  status: FocusSessionStatus;
  mode: FocusModeType;
  remainingSeconds: number;
  remainingFormatted: string;
  taskTitle?: string;
}

export interface WidgetSnapshotData {
  updatedAt: string;
  greeting: string;
  todayDateString: string;
  todayFormatted: string;
  totalTodayTasks: number;
  completedTodayTasks: number;
  remainingTodayTasks: number;
  progressPercent: number;
  nextTask: WidgetTaskItem | null;
  todayTasks: WidgetTaskItem[];
  focus: WidgetFocusState;
}

export const DEFAULT_WIDGET_SNAPSHOT: WidgetSnapshotData = {
  updatedAt: new Date().toISOString(),
  greeting: 'Good day',
  todayDateString: new Date().toISOString().split('T')[0],
  todayFormatted: 'Today',
  totalTodayTasks: 0,
  completedTodayTasks: 0,
  remainingTodayTasks: 0,
  progressPercent: 0,
  nextTask: null,
  todayTasks: [],
  focus: {
    status: 'idle',
    mode: 'work',
    remainingSeconds: 25 * 60,
    remainingFormatted: '25:00',
  },
};
