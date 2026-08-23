import { Task } from '../models/task';
import { Project } from '../models/project';
import { Tag } from '../models/tag';

export interface ConflictResolutionResult<T> {
  resolved: T;
  hasConflict: boolean;
  strategy: 'local_wins' | 'remote_wins' | 'field_merged';
}

export class ConflictResolver {
  /**
   * Deterministic tie-breaker between two conflicting states
   * Returns true if remote state wins, false if local state wins
   */
  public static shouldRemoteWin(
    localVersion: number = 0,
    localTimestamp: string,
    localDeviceId: string,
    remoteVersion: number = 0,
    remoteTimestamp: string,
    remoteDeviceId: string
  ): boolean {
    // 1. Higher logical version wins
    if (remoteVersion !== localVersion) {
      return remoteVersion > localVersion;
    }

    // 2. Later physical timestamp wins
    const localTime = new Date(localTimestamp).getTime() || 0;
    const remoteTime = new Date(remoteTimestamp).getTime() || 0;
    if (remoteTime !== localTime) {
      return remoteTime > localTime;
    }

    // 3. Deterministic deviceId tie-breaker
    return remoteDeviceId.localeCompare(localDeviceId) > 0;
  }

  /**
   * Resolves conflicts between two task records using entity-level field merging
   */
  public static resolveTaskConflict(
    localTask: Task,
    remoteTask: Task,
    remoteDeviceId: string
  ): ConflictResolutionResult<Task> {
    const remoteWins = this.shouldRemoteWin(
      localTask.version || 1,
      localTask.updatedAt,
      localTask.updatedByDeviceId || '',
      remoteTask.version || 1,
      remoteTask.updatedAt,
      remoteDeviceId
    );

    // If one side clearly supersedes the other, choose that version while preserving subtasks/tags union
    const base = remoteWins ? remoteTask : localTask;
    const secondary = remoteWins ? localTask : remoteTask;

    // Merge subtasks by ID
    const subtaskMap = new Map<string, any>();
    for (const sub of secondary.subtasks || []) {
      subtaskMap.set(sub.id, sub);
    }
    for (const sub of base.subtasks || []) {
      subtaskMap.set(sub.id, sub);
    }

    // Merge tags
    const mergedTags = Array.from(new Set([...(base.tags || []), ...(secondary.tags || [])]));

    // Merge projectIds
    const baseProjectIds = base.projectIds || (base.projectId ? [base.projectId] : []);
    const secondaryProjectIds = secondary.projectIds || (secondary.projectId ? [secondary.projectId] : []);
    const mergedProjectIds = Array.from(new Set([...baseProjectIds, ...secondaryProjectIds]));

    const resolved: Task = {
      ...base,
      projectIds: mergedProjectIds,
      projectId: mergedProjectIds[0] || base.projectId,
      inbox: typeof base.inbox === 'boolean' ? base.inbox : secondary.inbox,
      tags: mergedTags,
      subtasks: Array.from(subtaskMap.values()),
      version: Math.max(localTask.version || 1, remoteTask.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    };

    return {
      resolved,
      hasConflict: true,
      strategy: 'field_merged',
    };
  }

  /**
   * Resolves project conflict
   */
  public static resolveProjectConflict(
    localProject: Project,
    remoteProject: Project,
    remoteDeviceId: string
  ): ConflictResolutionResult<Project> {
    const remoteWins = this.shouldRemoteWin(
      localProject.version || 1,
      localProject.updatedAt,
      localProject.updatedByDeviceId || '',
      remoteProject.version || 1,
      remoteProject.updatedAt,
      remoteDeviceId
    );

    const resolved: Project = {
      ...(remoteWins ? remoteProject : localProject),
      version: Math.max(localProject.version || 1, remoteProject.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    };

    return {
      resolved,
      hasConflict: true,
      strategy: remoteWins ? 'remote_wins' : 'local_wins',
    };
  }

  /**
   * Resolves tag conflict
   */
  public static resolveTagConflict(localTag: Tag, remoteTag: Tag, remoteDeviceId: string): Tag {
    const remoteWins = this.shouldRemoteWin(
      localTag.version || 1,
      localTag.createdAt,
      localTag.updatedByDeviceId || '',
      remoteTag.version || 1,
      remoteTag.createdAt,
      remoteDeviceId
    );
    return remoteWins ? remoteTag : localTag;
  }
}
