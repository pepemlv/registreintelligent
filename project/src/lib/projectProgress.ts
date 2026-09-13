import type { TaskItem } from './types';

/** How "done" a single task is, from 0 to 1, used to compute a project's automatic progress. */
export function taskCompletionFraction(task: TaskItem): number {
  if (task.status === 'validated' || task.status === 'closed') return 1;
  const latestValidated = [...(task.activity ?? [])]
    .reverse()
    .find((entry) => entry.evaluation?.decision === 'validated' && typeof entry.proposed_progress === 'number');
  if (latestValidated && typeof latestValidated.proposed_progress === 'number') {
    return Math.min(1, Math.max(0, latestValidated.proposed_progress / 100));
  }
  if (task.status === 'submitted') return 0.5;
  if (task.status === 'in_progress' || task.status === 'assigned') return 0.1;
  return 0;
}

/** Weighted average of task completion — tasks without an explicit weight share what's left equally. */
export function computeProgress(tasks: TaskItem[]): number {
  if (tasks.length === 0) return 0;
  const explicitTotal = tasks.reduce((sum, t) => sum + (typeof t.weight === 'number' && t.weight > 0 ? t.weight : 0), 0);
  const unweightedCount = tasks.filter((t) => !(typeof t.weight === 'number' && t.weight > 0)).length;
  const fallbackWeight = unweightedCount > 0 ? Math.max(0, 100 - explicitTotal) / unweightedCount : 0;
  const weights = tasks.map((t) => (typeof t.weight === 'number' && t.weight > 0 ? t.weight : fallbackWeight));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
  const weightedSum = tasks.reduce((sum, t, i) => sum + weights[i] * taskCompletionFraction(t), 0);
  return Math.round((weightedSum / totalWeight) * 100);
}

export function computeDaysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(days) ? days : null;
}

export function computeDaysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  return computeDaysBetween(new Date().toISOString(), deadline);
}
