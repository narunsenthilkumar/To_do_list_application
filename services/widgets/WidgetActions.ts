import { router } from 'expo-router';
import { Repository } from '../storage/repository';
import { FocusTimerEngine } from '../focus/FocusTimerEngine';
import { haptics } from '../haptics';

export type AppRouter = typeof router;

export type WidgetActionType =
  | 'add_task'
  | 'open_today'
  | 'start_focus'
  | 'pause_focus'
  | 'complete_task'
  | 'open_task';

export class WidgetActions {
  /**
   * Dispatches a widget action intent
   */
  static async handleAction(
    actionType: WidgetActionType,
    payload?: { taskId?: string },
    routerInstance?: AppRouter | null
  ): Promise<void> {
    const engine = FocusTimerEngine.getInstance();

    const targetRouter = routerInstance || router;

    switch (actionType) {
      case 'add_task':
        haptics.medium();
        targetRouter.push('/modal/quick-add' as any);
        break;

      case 'open_today':
        haptics.light();
        targetRouter.push('/(tabs)' as any);
        break;

      case 'start_focus':
        haptics.medium();
        await engine.startTimer();
        targetRouter.push('/(tabs)/focus' as any);
        break;

      case 'pause_focus':
        haptics.light();
        await engine.pauseTimer();
        break;

      case 'complete_task':
        if (payload?.taskId) {
          haptics.success();
          const tasks = await Repository.loadTasks();
          const updated = tasks.map((t) =>
            t.id === payload.taskId
              ? { ...t, completed: true, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
              : t
          );
          await Repository.saveTasks(updated);
        }
        break;

      case 'open_task':
        if (payload?.taskId) {
          haptics.light();
          targetRouter.push(`/task/${payload.taskId}` as any);
        }
        break;
    }
  }
}

