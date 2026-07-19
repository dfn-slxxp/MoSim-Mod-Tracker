// ---------------------------------------------------------------------------
// AI Script Generator panel, shown on the robot detail page.
// Context fed to the model = your WHOLE script library (untick to exclude)
// + optionally .cs files scanned from the robot's linked repo (desktop only)
// + your description of the robot. Provider is either the Claude API or a
// local Ollama model (including one you trained yourself — TRAINING.md).
// ---------------------------------------------------------------------------
import { useMemo, useState } from 'react';
import { ANTHROPIC_MODELS, GEMINI_MODELS, Provider, generateScript, settings } from '../ai/client';
import { useStore } from '../store/StoreContext';
import type { Repo, Robot } from '../types';
import { Select } from './Select';

export function AiScriptPanel({ robot }: { robot: Robot }) {
  const { repos, scripts } = useStore();
  const repo: Repo | undefined = repos.find((r) => r.id === robot.repoId);
  const isDesktop = !!window.desktop;

  // Panel state. Settings persist via the `settings` helpers; the rest is
  // per-visit. Sets are used for exclusions so "everything included" is the
  // default without having to pre-check anything.
  const [open, setOpen] = useState(false);
  const [provider, setProviderState] = useState<Provider>(settings.getProvider());
  const [apiKey, setKeyState] = useState(settings.getApiKey());
  const [model, setModelState] = useState(settings.getModel());
  const [ollamaUrl, setOllamaUrlState] = useState(settings.getOllamaUrl());
  const [ollamaModel, setOllamaModelState] = useState(settings.getOllamaModel());
  const [geminiKey, setGeminiKeyState] = useState(settings.getGeminiKey());
  const [geminiModel, setGeminiModelState] = useState(settings.getGeminiModel());
  const [description, setDescription] = useState('');
  const [videos, setVideos] = useState('');
  const [excludedLibrary, setExcludedLibrary] = useState<Set<string>>(new Set());
  const [selectedRepoScripts, setSelectedRepoScripts] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  // Every .cs file the repo scan found, flattened across robot folders.
  const repoScripts = useMemo(() => {
    if (!repo?.scan) return [];
    const all: string[] = [];
    for (const r of repo.scan.robots) all.push(...r.scripts);
    return [...new Set(all)].sort();
  }, [repo]);

  const toggleLibrary = (id: string) => {
    setExcludedLibrary((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const run = async () => {
    setBusy(true);
    setError('');
    setOutput('');
    try {
      // Persist settings so they're remembered next time.
      settings.setProvider(provider);
      settings.setApiKey(apiKey);
      settings.setModel(model);
      settings.setOllamaUrl(ollamaUrl);
      settings.setOllamaModel(ollamaModel);
      settings.setGeminiKey(geminiKey);
      settings.setGeminiModel(geminiModel);

      // 1) All library scripts except the unticked ones.
      const examples: Record<string, string> = {};
      for (const s of scripts) {
        if (!excludedLibrary.has(s.id)) examples[s.name] = s.content;
      }
      // 2) Any repo files ticked on top (desktop reads them off disk).
      if (isDesktop && repo?.localPath) {
        for (const rel of repoScripts) {
          if (!selectedRepoScripts[rel]) continue;
          const res = await window.desktop!.readScript(repo.localPath, rel);
          if (res.ok) examples[rel] = res.content;
        }
      }

      const text = await generateScript({
        robotName: robot.name,
        team: robot.team,
        description,
        videoLinks: videos
          .split('\n')
          .map((v) => v.trim())
          .filter(Boolean),
        exampleScripts: examples
      });
      setOutput(text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    // Pull the first ```csharp block out of the response, if any.
    const match = output.match(/```(?:csharp|cs)?\n([\s\S]*?)```/);
    const code = match ? match[1] : output;
    const blob = new Blob([code], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${robot.name.replace(/\W+/g, '') || 'Robot'}.cs`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const includedCount = scripts.length - excludedLibrary.size;

  return (
    <div className="ai-panel">
      <button className="ai-toggle" onClick={() => setOpen(!open)}>
        <span className="ai-spark">✦</span> AI Script Generator
        <span className={`chevron ${open ? 'open' : ''}`}>▸</span>
      </button>
      {open && (
        <div className="ai-body">
          <p className="muted small">
            Describe what the robot does (mechanisms, setpoints, how it scores).{' '}
            {provider === 'gemini'
              ? 'YouTube links are sent directly to Gemini for video analysis.'
              : 'Video links are included as text reference — the description is what drives the script.'}
            {' '}Keys/settings stay on this device only.
          </p>

          <div className="ai-row">
            <label>
              Provider
              <Select
                value={provider}
                options={[
                  { value: 'gemini', label: 'Gemini (Google AI Studio key · watches videos)' },
                  { value: 'anthropic', label: 'Claude (Anthropic key · text only)' },
                  { value: 'ollama', label: 'Local model via Ollama (free, trainable)' },
                ]}
                onChange={(v) => setProviderState(v as Provider)}
              />
            </label>
            {provider === 'gemini' && (
              <>
                <label>
                  Google AI Studio key
                  <input
                    type="password"
                    placeholder="AIza..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKeyState(e.target.value)}
                  />
                </label>
                <label>
                  Model
                  <Select
                    value={geminiModel}
                    options={GEMINI_MODELS.map((m) => ({ value: m.id, label: m.label }))}
                    onChange={setGeminiModelState}
                  />
                </label>
              </>
            )}
            {provider === 'anthropic' && (
              <>
                <label>
                  Anthropic API key
                  <input
                    type="password"
                    placeholder="sk-ant-..."
                    value={apiKey}
                    onChange={(e) => setKeyState(e.target.value)}
                  />
                </label>
                <label>
                  Model
                  <Select
                    value={model}
                    options={ANTHROPIC_MODELS.map((m) => ({ value: m.id, label: m.label }))}
                    onChange={setModelState}
                  />
                </label>
              </>
            )}
            {provider === 'ollama' && (
              <>
                <label>
                  Ollama URL
                  <input value={ollamaUrl} onChange={(e) => setOllamaUrlState(e.target.value)} />
                </label>
                <label>
                  Model name
                  <input
                    placeholder="mosim-coder or qwen2.5-coder:7b"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModelState(e.target.value)}
                  />
                </label>
              </>
            )}
          </div>

          <label className="ai-field">
            Robot functionality
            <textarea
              rows={5}
              placeholder="e.g. 2-stage cascade elevator with a wrist coral end effector, ground algae intake on a pivot, deep climb with a winch. L4 needs a back-off before placing…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="ai-field">
            {provider === 'gemini'
              ? 'YouTube video links (one per line — Gemini will watch them)'
              : 'Match / reveal video links (one per line — TBA, YouTube, …)'}
            <textarea
              rows={2}
              placeholder={'https://youtu.be/...\nhttps://www.thebluealliance.com/match/...'}
              value={videos}
              onChange={(e) => setVideos(e.target.value)}
            />
          </label>

          <div className="ai-field">
            <span>
              Script library examples — {includedCount}/{scripts.length} included
              {scripts.length === 0 && (
                <span className="muted"> (drop your past scripts on the Scripts page first)</span>
              )}
            </span>
            {scripts.length > 0 && (
              <div className="ai-scripts">
                {scripts.map((s) => (
                  <label key={s.id} className="inline-check">
                    <input
                      type="checkbox"
                      checked={!excludedLibrary.has(s.id)}
                      onChange={() => toggleLibrary(s.id)}
                    />
                    {s.name}
                    {s.description && <span className="muted small"> — {s.description.slice(0, 60)}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          {isDesktop && repo?.localPath && repoScripts.length > 0 && (
            <div className="ai-field">
              <span>
                Extra examples from <b>{repo.name}</b> (read from disk)
              </span>
              <div className="ai-scripts">
                {repoScripts.map((rel) => (
                  <label key={rel} className="inline-check">
                    <input
                      type="checkbox"
                      checked={!!selectedRepoScripts[rel]}
                      onChange={(e) =>
                        setSelectedRepoScripts((s) => ({ ...s, [rel]: e.target.checked }))
                      }
                    />
                    {rel.split('/').pop()}
                    <span className="muted small"> ({rel})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="ai-actions">
            <button className="btn primary" disabled={busy || !description.trim()} onClick={run}>
              {busy ? 'Generating…' : 'Generate script'}
            </button>
            {output && (
              <>
                <button className="btn" onClick={() => navigator.clipboard.writeText(output)}>
                  Copy
                </button>
                <button className="btn" onClick={download}>
                  Download .cs
                </button>
              </>
            )}
          </div>

          {error && <div className="banner error rounded">{error}</div>}
          {output && <pre className="ai-output">{output}</pre>}
        </div>
      )}
    </div>
  );
}
