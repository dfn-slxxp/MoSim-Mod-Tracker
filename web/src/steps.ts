// ---------------------------------------------------------------------------
// The split template ships in /steps.json at the repo root (bundled default),
// but admins can edit it at runtime via the admin dashboard. The server copy
// (GET /api/steps) wins when present; loadRemoteSteps() swaps it in on app
// start by mutating STEPS in place so every existing import sees the update.
// ---------------------------------------------------------------------------
import stepsData from '../../steps.json';
import type { Robot, StepProgress } from './types';

export interface SubStep {
  id: string;
  label: string;
}

export interface Step {
  id: string;
  title: string;
  docUrl?: string;
  subs: SubStep[];
}

// Mutable on purpose: loadRemoteSteps/applySteps splice new content in place
// so components holding a reference re-read fresh data on next render.
export const STEPS: Step[] = [...stepsData.steps];

/** Replace the working step set (used after admin edits + remote load). */
export function applySteps(next: Step[]): void {
  STEPS.splice(0, STEPS.length, ...next);
}

/** Fetch the admin-edited steps from the server, if any. `base` = '' on web. */
export async function loadRemoteSteps(base: string): Promise<void> {
  try {
    const res = await fetch(`${base}/api/steps`);
    if (!res.ok) return;
    const body = (await res.json()) as { steps: Step[] | null };
    if (Array.isArray(body.steps) && body.steps.length > 0) applySteps(body.steps);
  } catch {
    // Offline or server missing the route: keep the bundled default.
  }
}

/** Total sub-step count (recomputed each call because STEPS is editable). */
export function totalSubs(): number {
  return STEPS.reduce((n, s) => n + s.subs.length, 0);
}

/** Progress for one step: how many sub-steps are checked. */
export function stepProgress(robot: Robot, step: Step): { done: number; total: number; complete: boolean } {
  const p = robot.progress[step.id];
  const done = step.subs.filter((sub) => p?.subs?.[sub.id]).length;
  return { done, total: step.subs.length, complete: done === step.subs.length };
}

/** Overall progress across all steps. */
export function robotProgress(robot: Robot): { done: number; total: number; pct: number; stepsDone: number } {
  let done = 0;
  let stepsDone = 0;
  for (const step of STEPS) {
    const sp = stepProgress(robot, step);
    done += sp.done;
    if (sp.complete) stepsDone++;
  }
  const total = totalSubs();
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100), stepsDone };
}

export function emptyStepProgress(): StepProgress {
  return { subs: {}, note: '' };
}
