// ---------------------------------------------------------------------------
// AI client with two providers:
//   1. 'anthropic' — the Claude API with your own key (kept in localStorage
//      only). The 'anthropic-dangerous-direct-browser-access' header opts into
//      browser-side calls; fine for a personal tool with your own key, never
//      OK on a public site with a shared key.
//   2. 'ollama' — a model running on YOUR machine (including one you trained
//      yourself — see TRAINING.md). Talks to Ollama's local HTTP API; no key,
//      no cost, works offline.
// ---------------------------------------------------------------------------

import { MOSIM_SYSTEM_PROMPT } from './reference';

export type Provider = 'anthropic' | 'ollama';

// localStorage keys for panel settings (all device-local, never synced).
const KEYS = {
  provider: 'mosim-ai-provider',
  apiKey: 'mosim-anthropic-key',
  model: 'mosim-anthropic-model',
  ollamaUrl: 'mosim-ollama-url',
  ollamaModel: 'mosim-ollama-model'
};

export const ANTHROPIC_MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (recommended)' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 (strongest)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest/cheapest)' }
];

// Trivial getters/setters around localStorage with defaults.
export const settings = {
  getProvider: (): Provider => (localStorage.getItem(KEYS.provider) === 'ollama' ? 'ollama' : 'anthropic'),
  setProvider: (p: Provider) => localStorage.setItem(KEYS.provider, p),
  getApiKey: () => localStorage.getItem(KEYS.apiKey) ?? '',
  setApiKey: (k: string) => localStorage.setItem(KEYS.apiKey, k.trim()),
  getModel: () => localStorage.getItem(KEYS.model) ?? ANTHROPIC_MODELS[0].id,
  setModel: (m: string) => localStorage.setItem(KEYS.model, m),
  getOllamaUrl: () => localStorage.getItem(KEYS.ollamaUrl) ?? 'http://localhost:11434',
  setOllamaUrl: (u: string) => localStorage.setItem(KEYS.ollamaUrl, u.trim().replace(/\/$/, '')),
  getOllamaModel: () => localStorage.getItem(KEYS.ollamaModel) ?? 'mosim-coder',
  setOllamaModel: (m: string) => localStorage.setItem(KEYS.ollamaModel, m.trim())
};

export interface GenerateInput {
  robotName: string;
  team: string;
  description: string;
  videoLinks: string[];
  /** name -> file content of past scripts to use as examples. */
  exampleScripts: Record<string, string>;
}

/** Build the user-turn message from all the pieces the panel collects. */
function buildPrompt(input: GenerateInput): string {
  const parts: string[] = [];
  parts.push(`Robot: ${input.team ? input.team + ' ' : ''}${input.robotName}`);
  parts.push(`\n## Functionality description\n${input.description || '(none provided)'}`);
  if (input.videoLinks.length > 0) {
    parts.push(
      `\n## Reference match/reveal videos (for context only — the description above covers what they show)\n` +
        input.videoLinks.map((v) => `- ${v}`).join('\n')
    );
  }
  const names = Object.keys(input.exampleScripts);
  if (names.length > 0) {
    parts.push(`\n## My past robot scripts (match their style and API usage)`);
    for (const name of names) {
      // Cap each file so a huge script can't blow past the context limit.
      const content = input.exampleScripts[name].slice(0, 30000);
      parts.push(`\n### ${name}\n\`\`\`csharp\n${content}\n\`\`\``);
    }
  }
  parts.push(`\nGenerate the complete robot script now.`);
  return parts.join('\n');
}

async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = settings.getApiKey();
  if (!apiKey) throw new Error('No API key set. Add your Anthropic API key first.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: settings.getModel(),
      max_tokens: 16000,
      system: MOSIM_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      detail = body?.error?.message ?? detail;
    } catch {
      /* keep the status text */
    }
    throw new Error(`Claude API error: ${detail}`);
  }

  const body = await res.json();
  // Response content is an array of blocks; concatenate the text ones.
  return (body.content as { type: string; text?: string }[])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

async function callOllama(prompt: string): Promise<string> {
  const url = settings.getOllamaUrl();
  let res: Response;
  try {
    res = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: settings.getOllamaModel(),
        stream: false,
        // Local models default to small context windows; raise it so the
        // example scripts actually fit. Needs enough RAM/VRAM — see TRAINING.md.
        options: { num_ctx: 16384 },
        messages: [
          { role: 'system', content: MOSIM_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ]
      })
    });
  } catch {
    throw new Error(
      `Couldn't reach Ollama at ${url}. Is it running? (ollama serve, then ollama pull/create your model — see TRAINING.md)`
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text.slice(0, 300)}`);
  }
  const body = await res.json();
  return body?.message?.content ?? '';
}

/** Generate via whichever provider is selected. Throws readable Errors. */
export async function generateScript(input: GenerateInput): Promise<string> {
  const prompt = buildPrompt(input);
  return settings.getProvider() === 'ollama' ? callOllama(prompt) : callAnthropic(prompt);
}
