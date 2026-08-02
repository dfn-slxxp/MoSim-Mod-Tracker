// ---------------------------------------------------------------------------
// AI Prompt Builder, shown on the robot detail page. Unlike the old version,
// this does NOT call any AI model — it assembles a single self-contained text
// prompt (directions + reference source, see ai/promptBuilder.ts) that you
// paste into any AI model of your choice. The built prompt is persisted on
// the robot record server-side (robot.aiPrompt), so it survives reloads and
// even clearing the browser cache — not just localStorage.
//
// Reference material bundled into the prompt:
//   - The team's real robot GitHub repo (fetched live, embedded inline)
//   - A local RobotFramework source checkout (desktop only, per-device path,
//     embedded inline) — the real API the script must use
//   - Your saved script-library examples — linked via the public
//     /api/scripts/:id/raw endpoint instead of pasted inline, to keep things short
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react';
import { buildRobotPrompt } from '../ai/promptBuilder';
import { isTauri, getServerUrl } from '../lib/desktop';
import { fetchRepoSource } from '../lib/github';
import { getFrameworkPath, setFrameworkPath } from '../lib/frameworkPath';
import { getRepoPath } from '../lib/repoPaths';
import { useStore } from '../store/StoreContext';
import type { Repo, Robot } from '../types';

async function apiOrigin(): Promise<string> {
  return isTauri() ? await getServerUrl() : window.location.origin;
}

export function AiScriptPanel({ robot }: { robot: Robot }) {
  const { repos, scripts, api } = useStore();
  const repo: Repo | undefined = repos.find((r) => r.id === robot.repoId);
  const isDesktop = !!window.desktop;
  // This device's folder for the linked repo (empty on web / if unset).
  const repoPath = repo ? getRepoPath(repo.id) : '';

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [sourceRepoUrl, setSourceRepoUrl] = useState('');
  const [excludedLibrary, setExcludedLibrary] = useState<Set<string>>(new Set());
  const [selectedRepoScripts, setSelectedRepoScripts] = useState<Record<string, boolean>>({});

  const [frameworkPath, setFrameworkPathState] = useState(getFrameworkPath());
  const [frameworkFiles, setFrameworkFiles] = useState<string[]>([]);
  const [excludedFramework, setExcludedFramework] = useState<Set<string>>(new Set());
  const [scanningFramework, setScanningFramework] = useState(false);
  const [frameworkError, setFrameworkError] = useState('');

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [output, setOutput] = useState(robot.aiPrompt ?? '');

  // Reload the persisted prompt whenever we're pointed at a different robot.
  useEffect(() => {
    setOutput(robot.aiPrompt ?? '');
  }, [robot.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every .cs file the repo scan found, flattened across robot folders.
  const repoScripts = useMemo(() => {
    if (!repo?.scan) return [];
    const all: string[] = [];
    for (const r of repo.scan.robots) all.push(...r.scripts);
    return [...new Set(all)].sort();
  }, [repo]);

  const scanFramework = async () => {
    if (!isDesktop || !frameworkPath.trim()) return;
    setScanningFramework(true);
    setFrameworkError('');
    try {
      const res = await window.desktop!.listCsFiles(frameworkPath.trim());
      if (!res.ok) {
        setFrameworkError(res.error || 'Could not read that folder.');
        setFrameworkFiles([]);
      } else {
        setFrameworkFiles(res.files);
        setExcludedFramework(new Set()); // default: all included
      }
    } finally {
      setScanningFramework(false);
    }
  };

  const toggleSet = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  };

  const build = async () => {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      setFrameworkPath(frameworkPath);

      // 1) The team's real robot code from a GitHub repo (translation source).
      let sourceRepo: { url: string; files: Record<string, string> } | undefined;
      if (sourceRepoUrl.trim()) {
        setStatus('Reading the team’s GitHub repo…');
        const src = await fetchRepoSource(sourceRepoUrl.trim());
        sourceRepo = { url: src.url, files: src.files };
      }

      // 2) Local RobotFramework reference source (desktop only).
      const referenceGroups: { heading: string; note: string; files: Record<string, string> }[] = [];
      if (isDesktop && frameworkPath.trim() && frameworkFiles.length > 0) {
        setStatus('Reading RobotFramework source…');
        const frameworkContent: Record<string, string> = {};
        for (const rel of frameworkFiles) {
          if (excludedFramework.has(rel)) continue;
          const res = await window.desktop!.readScript(frameworkPath.trim(), rel);
          if (res.ok) frameworkContent[rel] = res.content;
        }
        if (Object.keys(frameworkContent).length > 0) {
          referenceGroups.push({
            heading: `RobotFramework source (${frameworkPath.trim()})`,
            note:
              'The actual MoSim RobotFramework API — the only movement, joint, roller, and ' +
              "game-piece methods available. Use these exact signatures; do not invent methods that aren't here.",
            files: frameworkContent,
          });
        }
      }

      // 2b) Other .cs files scanned from this robot's linked repo (desktop only).
      if (isDesktop && repoPath) {
        const chosen = repoScripts.filter((rel) => selectedRepoScripts[rel]);
        if (chosen.length > 0) {
          setStatus('Reading repo scripts…');
          const repoContent: Record<string, string> = {};
          for (const rel of chosen) {
            const res = await window.desktop!.readScript(repoPath, rel);
            if (res.ok) repoContent[rel] = res.content;
          }
          if (Object.keys(repoContent).length > 0) {
            referenceGroups.push({
              heading: `Other scripts from ${repo?.name ?? 'this repo'} (read from disk)`,
              note: 'Other mod scripts in the same local repo — for style/API reference only.',
              files: repoContent,
            });
          }
        }
      }

      // 3) Library scripts referenced by link (not pasted inline).
      setStatus('Linking library scripts…');
      const origin = await apiOrigin();
      const scriptLinks = scripts
        .filter((s) => !excludedLibrary.has(s.id))
        .map((s) => ({ name: s.name, url: `${origin}/api/scripts/${s.id}/raw` }));

      const text = buildRobotPrompt({
        robotName: robot.name,
        team: robot.team,
        game: robot.game,
        description,
        sourceRepo,
        referenceGroups,
        scriptLinks,
      });

      setOutput(text);
      setStatus('');
      await api.updateRobot(robot.id, { aiPrompt: text });
    } catch (e) {
      setError((e as Error).message);
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  const clearPrompt = async () => {
    setOutput('');
    await api.updateRobot(robot.id, { aiPrompt: '' });
  };

  const includedCount = scripts.length - excludedLibrary.size;
  const includedFrameworkCount = frameworkFiles.length - excludedFramework.size;

  return (
    <div className="ai-panel">
      <button className="ai-toggle" onClick={() => setOpen(!open)}>
        <span className="ai-spark">✦</span> AI Prompt Builder
        <span className={`chevron ${open ? 'open' : ''}`}>▸</span>
      </button>
      {open && (
        <div className="ai-body">
          <p className="muted small">
            Builds a single prompt you paste into any AI model of your choice — this app never
            calls an AI itself. Describe what the robot does <b>or</b> paste the team's real robot
            GitHub repo, add your local RobotFramework source for reference, and the prompt fully
            explains what's needed to write the script. The built prompt is saved to this robot.
          </p>

          <label className="ai-field">
            Robot functionality
            <textarea
              rows={5}
              placeholder="e.g. 2-stage cascade elevator with a wrist coral end effector, ground algae intake on a pivot, deep climb with a winch. L4 needs a back-off before placing…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="ai-or">or</div>

          <label className="ai-field">
            Team's real robot code — GitHub repo URL
            <input
              placeholder="https://github.com/team9496/Reefscape-2025"
              value={sourceRepoUrl}
              onChange={(e) => setSourceRepoUrl(e.target.value)}
            />
            <span className="muted small">
              Embedded in the prompt as reference-only source (public repos only) — the target AI
              translates it, it isn't copied verbatim.
            </span>
          </label>

          {isDesktop && (
            <div className="ai-field">
              <span>RobotFramework source (reference-only, embedded in the prompt)</span>
              <input
                placeholder="C:\path\to\MoSim-Reefscape-Public\Assets\Scripts\RobotFramework"
                value={frameworkPath}
                onChange={(e) => setFrameworkPathState(e.target.value)}
                onBlur={() => setFrameworkPath(frameworkPath)}
              />
              <div className="ai-row">
                <button
                  className="btn subtle"
                  type="button"
                  disabled={!frameworkPath.trim() || scanningFramework}
                  onClick={scanFramework}
                >
                  {scanningFramework ? 'Scanning…' : 'Scan folder'}
                </button>
                {frameworkFiles.length > 0 && (
                  <span className="muted small">
                    {includedFrameworkCount}/{frameworkFiles.length} .cs files included
                  </span>
                )}
              </div>
              {frameworkError && <div className="banner error rounded">{frameworkError}</div>}
              {frameworkFiles.length > 0 && (
                <div className="ai-scripts">
                  {frameworkFiles.map((rel) => (
                    <label key={rel} className="inline-check">
                      <input
                        type="checkbox"
                        checked={!excludedFramework.has(rel)}
                        onChange={() => toggleSet(excludedFramework, setExcludedFramework, rel)}
                      />
                      {rel.split('/').pop()}
                      <span className="muted small"> ({rel})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="ai-field">
            <span>
              Script library links — {includedCount}/{scripts.length} included
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
                      onChange={() => toggleSet(excludedLibrary, setExcludedLibrary, s.id)}
                    />
                    {s.name}
                    {s.description && <span className="muted small"> — {s.description.slice(0, 60)}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          {isDesktop && repo && repoPath && repoScripts.length > 0 && (
            <div className="ai-field">
              <span>
                Other scripts from <b>{repo.name}</b> (read from disk, embedded as reference)
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
            <button
              className="btn primary"
              disabled={busy || (!description.trim() && !sourceRepoUrl.trim())}
              onClick={build}
            >
              {busy ? 'Building…' : 'Build prompt'}
            </button>
            {output && (
              <>
                <button className="btn" onClick={() => navigator.clipboard.writeText(output)}>
                  Copy
                </button>
                <button className="btn danger subtle" onClick={clearPrompt}>
                  Clear
                </button>
              </>
            )}
          </div>

          {busy && status && <div className="muted small">{status}</div>}
          {error && <div className="banner error rounded">{error}</div>}
          {output && <pre className="ai-output">{output}</pre>}
        </div>
      )}
    </div>
  );
}
