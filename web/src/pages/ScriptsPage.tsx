// ---------------------------------------------------------------------------
// Scripts page — your personal .cs library. Drag files in (or browse); every
// script here is fed to the AI generator as an example by default, and the
// whole library can be exported as a JSONL fine-tuning dataset (see
// TRAINING.md for how to train your own model on it).
//
// Browser file APIs used here: drag events carry a DataTransfer with File
// objects; File.text() reads one as a string (async, returns a Promise).
// ---------------------------------------------------------------------------
import { DragEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeScript, providerConfigured } from '../ai/client';
import { MOSIM_SYSTEM_PROMPT } from '../ai/reference';
import { useDialog } from '../components/Dialog';
import { Select } from '../components/Select';
import { useStore } from '../store/StoreContext';
import type { ScriptDoc } from '../types';

const MAX_SIZE = 400 * 1024; // per-file cap; Firestore documents max out at ~1 MB

function fmtSize(chars: number): string {
  return chars > 1024 ? `${(chars / 1024).toFixed(1)} KB` : `${chars} B`;
}

function ScriptRow({ script }: { script: ScriptDoc }) {
  const { robots, api, canEdit } = useStore();
  const { confirmDialog, alertDialog } = useDialog();
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const robot = robots.find((r) => r.id === script.robotId);

  const reanalyze = async () => {
    setAnalyzing(true);
    try {
      const description = await analyzeScript(script.name, script.content);
      if (description) await api.updateScript(script.id, { description });
    } catch (e) {
      void alertDialog((e as Error).message, 'AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="script-row">
      <div className="script-head" onClick={() => setOpen(!open)}>
        <span className="script-name">{script.name}</span>
        {robot && (
          <Link to={`/robot/${robot.id}`} className="pack-chip link" onClick={(e) => e.stopPropagation()}>
            {robot.team ? `${robot.team} ` : ''}
            {robot.name}
          </Link>
        )}
        <span className="muted small">{fmtSize(script.content.length)}</span>
        <span className="spacer" />
        <span className="muted small">{new Date(script.createdAt).toLocaleDateString()}</span>
        <span className={`chevron ${open ? 'open' : ''}`}>▸</span>
      </div>
      {open && (
        <div className="script-body">
          <div className="script-fields">
            <label className="ai-field grow">
              What does this robot do? (used as the prompt when exporting training data)
              <textarea
                key={`d-${script.id}-${script.description}`}
                rows={4}
                defaultValue={script.description}
                readOnly={!canEdit}
                placeholder="e.g. 2-stage elevator, coral end effector, algae pivot intake, deep climb…"
                onBlur={(e) => {
                  if (e.target.value !== script.description)
                    api.updateScript(script.id, { description: e.target.value });
                }}
              />
            </label>
            {canEdit && (
              <>
                <label className="ai-field">
                  Robot
                  <Select
                    value={script.robotId ?? ''}
                    options={[
                      { value: '', label: '—' },
                      ...robots.map((r) => ({ value: r.id, label: `${r.team ? `${r.team} ` : ''}${r.name}` })),
                    ]}
                    onChange={(v) => api.updateScript(script.id, { robotId: v || null })}
                  />
                </label>
                <button
                  className="btn subtle"
                  disabled={analyzing || !providerConfigured()}
                  title="Regenerate the description with AI (overwrites the current one)"
                  onClick={reanalyze}
                >
                  {analyzing ? 'Analyzing…' : '✦ AI describe'}
                </button>
                <button
                  className="btn danger subtle"
                  onClick={async () => {
                    if (await confirmDialog({ title: 'Remove script', message: `Remove ${script.name} from the library?`, confirmLabel: 'Remove' }))
                      api.deleteScript(script.id);
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
          <pre className="script-content">{script.content}</pre>
        </div>
      )}
    </div>
  );
}

export function ScriptsPage() {
  const { scripts, api, canEdit, user } = useStore();
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | File[]) => {
    let added = 0;
    let skipped = 0;
    const canAnalyze = providerConfigured();
    for (const f of Array.from(files)) {
      if (!/\.(cs|txt)$/i.test(f.name) || f.size > MAX_SIZE) {
        skipped++;
        continue;
      }
      const content = await f.text();

      // AI autofill: describe what the robot does (only what the script shows).
      // Editable afterwards in the description box. Failure = empty description.
      let description = '';
      if (canAnalyze) {
        setStatus(`Analyzing ${f.name} with AI…`);
        try {
          description = await analyzeScript(f.name, content);
        } catch {
          // No key / network / provider error — add without a description.
        }
      }

      await api.addScript({ name: f.name, description, content, robotId: null });
      added++;
    }
    setStatus(
      `Added ${added} script${added === 1 ? '' : 's'}` +
        (skipped ? ` (skipped ${skipped} — only .cs/.txt under 400 KB)` : '') +
        (added > 0 && !canAnalyze
          ? ' — set an AI key (robot page → AI panel) to auto-describe scripts'
          : '')
    );
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); // without this the browser just opens the file
    setDragOver(false);
    if (canEdit) addFiles(e.dataTransfer.files);
  };

  /**
   * Export the library as JSONL (one JSON object per line) in the standard
   * chat fine-tuning format: system + user (your description) + assistant
   * (the script). This is the dataset TRAINING.md trains on.
   */
  const exportJsonl = () => {
    const lines = scripts.map((s) =>
      JSON.stringify({
        messages: [
          { role: 'system', content: MOSIM_SYSTEM_PROMPT },
          {
            role: 'user',
            content:
              (s.description?.trim() || `Write the MoSim robot script ${s.name}.`) +
              '\n\nGenerate the complete robot script now.'
          },
          { role: 'assistant', content: '```csharp\n' + s.content + '\n```' }
        ]
      })
    );
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'application/jsonl' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mosim-scripts-dataset.jsonl';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const missingDescriptions = scripts.filter((s) => !s.description?.trim()).length;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Script library</h1>
        <p className="muted">
          Drop your past robot scripts here. The AI generator uses all of them as examples, and
          you can export them as a training dataset for your own model (see TRAINING.md).
        </p>
      </div>

      {!user && (
        <div className="empty">Sign in to see your script library (scripts are never public).</div>
      )}

      {canEdit && (
        <div
          className={`dropzone ${dragOver ? 'over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInput.current?.click()}
        >
          Drag .cs files here (or click to browse)
          <input
            ref={fileInput}
            type="file"
            accept=".cs,.txt"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = ''; // allow re-adding the same file later
            }}
          />
        </div>
      )}
      {status && <div className="muted small drop-status">{status}</div>}

      {scripts.length > 0 && (
        <div className="script-tools">
          <span className="muted small">
            {scripts.length} script{scripts.length === 1 ? '' : 's'}
            {missingDescriptions > 0 &&
              ` — ${missingDescriptions} missing a description (fill them in before exporting training data)`}
          </span>
          <button className="btn" onClick={exportJsonl}>
            Export training dataset (JSONL)
          </button>
        </div>
      )}

      <div className="script-list">
        {scripts.map((s) => (
          <ScriptRow key={s.id} script={s} />
        ))}
      </div>
    </div>
  );
}
