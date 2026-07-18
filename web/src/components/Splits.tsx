// ---------------------------------------------------------------------------
// The splits list — the heart of the tracker. Each step is a row (like a
// LiveSplit split); expanding it shows checkable sub-steps, a note box, and a
// link to the relevant docs page. A step is "done" when all its sub-steps are
// checked; the header checkbox checks/unchecks the whole step at once.
// Progress writes go through api.updateRobot, replacing the robot's `progress`
// map — both backends treat that as a single small update.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { STEPS, Step, stepProgress } from '../steps';
import { useStore } from '../store/StoreContext';
import type { Robot, StepProgress } from '../types';

function cloneStep(robot: Robot, stepId: string): StepProgress {
  const existing = robot.progress[stepId];
  return { subs: { ...(existing?.subs ?? {}) }, note: existing?.note ?? '' };
}

export function Splits({
  robot,
  editable,
  compact
}: {
  robot: Robot;
  editable: boolean;
  compact?: boolean;
}) {
  const { api } = useStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const saveStep = (stepId: string, sp: StepProgress) => {
    api.updateRobot(robot.id, { progress: { ...robot.progress, [stepId]: sp } });
  };

  const toggleSub = (stepId: string, subId: string) => {
    if (!editable) return;
    const sp = cloneStep(robot, stepId);
    sp.subs[subId] = !sp.subs[subId];
    saveStep(stepId, sp);
  };

  const toggleStep = (step: Step) => {
    if (!editable) return;
    const sp = cloneStep(robot, step.id);
    const complete = step.subs.every((s) => sp.subs[s.id]);
    for (const s of step.subs) sp.subs[s.id] = !complete;

    const next = { ...robot.progress, [step.id]: sp };
    if (!complete) {
      // Checking a step implies everything before it is done too — cascade
      // them checked. Unchecking never cascades, so manual corrections stick.
      const idx = STEPS.findIndex((s) => s.id === step.id);
      for (let i = 0; i < idx; i++) {
        const prev = STEPS[i];
        const psp = cloneStep(robot, prev.id);
        for (const s of prev.subs) psp.subs[s.id] = true;
        next[prev.id] = psp;
      }
    }
    api.updateRobot(robot.id, { progress: next });
  };

  const setNote = (stepId: string, note: string) => {
    if (!editable) return;
    const sp = cloneStep(robot, stepId);
    sp.note = note;
    saveStep(stepId, sp);
  };

  const setAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    if (open) for (const s of STEPS) next[s.id] = true;
    setExpanded(next);
  };

  const checkAll = () => {
    if (!editable) return;
    const progress: Record<string, StepProgress> = {};
    for (const step of STEPS) {
      progress[step.id] = {
        subs: Object.fromEntries(step.subs.map((s) => [s.id, true])),
        note: robot.progress[step.id]?.note ?? '',
      };
    }
    api.updateRobot(robot.id, { progress });
  };

  const uncheckAll = () => {
    if (!editable) return;
    const progress: Record<string, StepProgress> = {};
    for (const step of STEPS) {
      progress[step.id] = {
        subs: Object.fromEntries(step.subs.map((s) => [s.id, false])),
        note: robot.progress[step.id]?.note ?? '',
      };
    }
    api.updateRobot(robot.id, { progress });
  };

  return (
    <div className={`splits ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="splits-tools">
          {editable && (
            <>
              <button className="btn subtle" onClick={checkAll}>Check all</button>
              <button className="btn subtle" onClick={uncheckAll}>Uncheck all</button>
            </>
          )}
          <button className="btn subtle" onClick={() => setAll(true)}>Expand all</button>
          <button className="btn subtle" onClick={() => setAll(false)}>Collapse all</button>
        </div>
      )}
      {STEPS.map((step, i) => {
        const sp = stepProgress(robot, step);
        const open = !!expanded[step.id];
        const note = robot.progress[step.id]?.note ?? '';
        return (
          <div key={step.id} className={`split ${sp.complete ? 'done' : sp.done > 0 ? 'partial' : ''}`}>
            <div className="split-head" onClick={() => setExpanded((e) => ({ ...e, [step.id]: !open }))}>
              <button
                className={`check ${sp.complete ? 'checked' : sp.done > 0 ? 'half' : ''}`}
                title={sp.complete ? 'Uncheck all sub-steps' : 'Check all sub-steps'}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStep(step);
                }}
                disabled={!editable}
              >
                {sp.complete ? '✓' : sp.done > 0 ? '–' : ''}
              </button>
              <span className="split-index">{i + 1}</span>
              <span className="split-title">
                {step.title}
                {note && <span className="note-dot" title="Has a note" />}
              </span>
              <span className="split-count">
                {sp.done}/{sp.total}
              </span>
              <span className={`chevron ${open ? 'open' : ''}`}>▸</span>
            </div>
            {open && (
              <div className="split-body">
                {step.subs.map((sub) => {
                  const checked = !!robot.progress[step.id]?.subs?.[sub.id];
                  return (
                    <label key={sub.id} className={`substep ${checked ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!editable}
                        onChange={() => toggleSub(step.id, sub.id)}
                      />
                      <span>{sub.label}</span>
                    </label>
                  );
                })}
                <textarea
                  key={`${robot.id}-${step.id}`}
                  className="step-note"
                  placeholder={editable ? 'Notes for future you…' : 'No notes'}
                  defaultValue={note}
                  readOnly={!editable}
                  onBlur={(e) => {
                    if (e.target.value !== note) setNote(step.id, e.target.value);
                  }}
                />
                {step.docUrl && (
                  <a className="doc-link" href={step.docUrl} target="_blank" rel="noreferrer">
                    Docs: {step.title} ↗
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WhatsLeft({ robot }: { robot: Robot }) {
  const remaining = STEPS.map((step) => ({ step, sp: stepProgress(robot, step) })).filter(
    ({ sp }) => !sp.complete
  );
  if (remaining.length === 0) {
    return <div className="whats-left all-done">All steps complete — ship it! 🎉</div>;
  }
  return (
    <div className="whats-left">
      <h3>Left to do</h3>
      <ul>
        {remaining.map(({ step, sp }) => (
          <li key={step.id}>
            <span>{step.title}</span>
            <span className="muted">
              {sp.total - sp.done} sub-step{sp.total - sp.done === 1 ? '' : 's'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
