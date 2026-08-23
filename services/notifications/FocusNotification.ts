import { ActiveFocusSession } from '../../models/focus';
import { FocusTimerNotification } from '../focus/FocusTimerNotification';
import { NotificationCapability } from './NotificationCapability';

export class FocusNotification {
  /**
   * Updates focus timer presentation according to device capability level
   */
  static async updateTimer(
    session: ActiveFocusSession,
    remainingSeconds: number,
    taskTitle?: string
  ): Promise<void> {
    const profile = await NotificationCapability.getCapabilityProfile();

    if (profile.capabilityLevel === 'UNSUPPORTED') {
      return;
    }

    // Delegate to FocusTimerNotification
    await FocusTimerNotification.updateOngoingNotification(session, remainingSeconds, taskTitle);
  }

  /**
   * Schedules completion alert
   */
  static async scheduleCompletion(
    session: ActiveFocusSession,
    taskTitle?: string
  ): Promise<void> {
    const profile = await NotificationCapability.getCapabilityProfile();

    if (profile.capabilityLevel === 'UNSUPPORTED') {
      return;
    }

    await FocusTimerNotification.scheduleCompletionNotification(session, taskTitle);
  }

  /**
   * Clears active focus presentation
   */
  static async clear(): Promise<void> {
    await FocusTimerNotification.clearAll();
  }
}
