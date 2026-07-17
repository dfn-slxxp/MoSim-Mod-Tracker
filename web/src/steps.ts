// ---------------------------------------------------------------------------
// The split template lives in /steps.json at the repo root so the web UI and
// the Python desktop app share ONE source of truth (edit that file to change
// your workflow). This module types it and provides the progress math.
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

export const STEPS: Step[] = stepsData.steps;

export const TOTAL_SUBS = STEPS.reduce((n, s) => n + s.subs.length, 0);

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
  return { done, total: TOTAL_SUBS, pct: TOTAL_SUBS === 0 ? 0 : Math.round((done / TOTAL_SUBS) * 100), stepsDone };
}

export function emptyStepProgress(): StepProgress {
  return { subs: {}, note: '' };
}
