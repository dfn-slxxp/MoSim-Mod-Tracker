// ---------------------------------------------------------------------------
// AI client with several providers:
//   1. 'openrouter' — FREE hosted models (no payment). One free API key from
//      openrouter.ai unlocks free ":free" models (DeepSeek, Qwen Coder, Llama…).
//      OpenAI-compatible, browser-callable. Best "I don't want to pay" option.
//   2. 'gemini' — Google AI Studio key (free tier), and it can watch YouTube.
//   3. 'anthropic' — the Claude API with your own (paid) key.
//   4. 'ollama' — a model running on YOUR machine (free, offline; see TRAINING.md).
// Keys live in localStorage only, never synced.
// ---------------------------------------------------------------------------

import { MOSIM_SYSTEM_PROMPT } from './reference';

export type Provider = 'anthropic' | 'ollama' | 'gemini' | 'openrouter';

// localStorage keys for panel settings (all device-local, never synced).
const KEYS = {
  provider: 'mosim-ai-provider',
  apiKey: 'mosim-anthropic-key',
  model: 'mosim-anthropic-model',
  ollamaUrl: 'mosim-ollama-url',
  ollamaModel: 'mosim-ollama-model',
  geminiKey: 'mosim-gemini-key',
  geminiModel: 'mosim-gemini-model',
  openRouterKey: 'mosim-openrouter-key',
  openRouterModel: 'mosim-openrouter-model',
};

export const ANTHROPIC_MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (recommended)' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 (strongest)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest/cheapest)' }
];

export const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (fast · video)' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (strongest · video)' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (fast · video)' },
];

// Free OpenRouter models (the ":free" tier — no charge, just rate limits).
// OpenRouter rotates these often, so the panel fetches the LIVE list via
// fetchFreeOpenRouterModels(); this is only the offline fallback (kept current).
export const OPENROUTER_MODELS = [
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B (free)' },
  { id: 'cohere/north-mini-code:free', label: 'Cohere North Mini Code (free · code)' },
  { id: 'openai/gpt-oss-20b:free', label: 'OpenAI gpt-oss 20B (free)' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (free)' },
];

// Cached live free-model list from OpenRouter (public endpoint, no key needed).
let _freeModelCache: { id: string; label: string }[] | null = null;

/** Fetch the CURRENT free (":free") OpenRouter models, biggest context first. */
export async function fetchFreeOpenRouterModels(): Promise<{ id: string; label: string }[]> {
  if (_freeModelCache) return _freeModelCache;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) return OPENROUTER_MODELS;
    const body = await res.json();
    const data = (body?.data ?? []) as { id: string; name?: string; context_length?: number }[];
    const free = data
      .filter((m) => m.id.endsWith(':free'))
      .sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0))
      .map((m) => ({
        id: m.id,
        label: (m.name ?? m.id).replace(/:?\s*\(free\)\s*$/i, '').trim() + ' (free)',
      }));
    if (free.length) { _freeModelCache = free; return free; }
  } catch { /* offline — use fallback */ }
  return OPENROUTER_MODELS;
}

// Trivial getters/setters around localStorage with defaults.
export const settings = {
  getProvider: (): Provider => {
    const v = localStorage.getItem(KEYS.provider);
    if (v === 'ollama' || v === 'gemini' || v === 'openrouter') return v;
    return 'anthropic';
  },
  setProvider: (p: Provider) => localStorage.setItem(KEYS.provider, p),
  getApiKey: () => localStorage.getItem(KEYS.apiKey) ?? '',
  setApiKey: (k: string) => localStorage.setItem(KEYS.apiKey, k.trim()),
  getModel: () => localStorage.getItem(KEYS.model) ?? ANTHROPIC_MODELS[0].id,
  setModel: (m: string) => localStorage.setItem(KEYS.model, m),
  getOllamaUrl: () => localStorage.getItem(KEYS.ollamaUrl) ?? 'http://localhost:11434',
  setOllamaUrl: (u: string) => localStorage.setItem(KEYS.ollamaUrl, u.trim().replace(/\/$/, '')),
  getOllamaModel: () => localStorage.getItem(KEYS.ollamaModel) ?? 'mosim-coder',
  setOllamaModel: (m: string) => localStorage.setItem(KEYS.ollamaModel, m.trim()),
  getGeminiKey: () => localStorage.getItem(KEYS.geminiKey) ?? '',
  setGeminiKey: (k: string) => localStorage.setItem(KEYS.geminiKey, k.trim()),
  getGeminiModel: () => localStorage.getItem(KEYS.geminiModel) ?? GEMINI_MODELS[0].id,
  setGeminiModel: (m: string) => localStorage.setItem(KEYS.geminiModel, m),
  getOpenRouterKey: () => localStorage.getItem(KEYS.openRouterKey) ?? '',
  setOpenRouterKey: (k: string) => localStorage.setItem(KEYS.openRouterKey, k.trim()),
  getOpenRouterModel: () => localStorage.getItem(KEYS.openRouterModel) ?? OPENROUTER_MODELS[0].id,
  setOpenRouterModel: (m: string) => localStorage.setItem(KEYS.openRouterModel, m.trim()),
};

export interface GenerateInput {
  robotName: string;
  team: string;
  description: string;
  videoLinks: string[];
  /** name -> file content of past scripts to use as examples. */
  exampleScripts: Record<string, string>;
  /** A real FRC team's robot code to translate into MoSim (path -> content). */
  sourceRepo?: { url: string; files: Record<string, string> };
}

function isYouTubeUrl(url: string): boolean {
  return /youtu\.be\/|youtube\.com\/watch/.test(url);
}

/** Build the text-only user message (used by Claude + Ollama). */
function buildPrompt(input: GenerateInput): string {
  const parts: string[] = [];
  parts.push(`Robot: ${input.team ? input.team + ' ' : ''}${input.robotName}`);

  const repoFiles = input.sourceRepo?.files ?? {};
  const hasRepo = Object.keys(repoFiles).length > 0;

  if (hasRepo) {
    parts.push(
      `\n## The team's real robot source code (from ${input.sourceRepo!.url})\n` +
        `This is the actual FRC team's code. Study its subsystems, mechanisms, motors, sensors, ` +
        `and control logic, then recreate the robot's behavior as a single MoSim C# robot script. ` +
        `Reproduce WHICH mechanisms exist and how they coordinate per pose, but do NOT copy setpoint ` +
        `numbers — the real code's units differ from MoSim's, so follow the Setpoint handling rules: ` +
        `coordinated multi-mechanism poses become Setpoint ScriptableObjects, single tweakables become ` +
        `plain float fields, and all setpoint values are left as // TODO tune-in-MoSim placeholders.`
    );
    for (const [path, content] of Object.entries(repoFiles)) {
      const lang = path.split('.').pop() ?? '';
      parts.push(`\n### ${path}\n\`\`\`${lang}\n${content.slice(0, 40000)}\n\`\`\``);
    }
  }

  if (input.description.trim()) {
    parts.push(`\n## Functionality description\n${input.description}`);
  } else if (!hasRepo) {
    parts.push(`\n## Functionality description\n(none provided)`);
  }

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

/** OpenRouter (OpenAI-compatible). Free ":free" models cost nothing. */
async function callOpenRouter(prompt: string, maxTokens = 16000): Promise<string> {
  const apiKey = settings.getOpenRouterKey();
  if (!apiKey) throw new Error('No OpenRouter key set. Create a free key at openrouter.ai/keys.');

  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        'x-title': 'MoSim Mod Tracker',
      },
      body: JSON.stringify({
        model: settings.getOpenRouterModel(),
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: MOSIM_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
    });
  } catch {
    throw new Error('Could not reach OpenRouter. Check your connection.');
  }

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try { const b = await res.json(); detail = b?.error?.message ?? detail; } catch { /* keep */ }
    if (res.status === 429) detail += ' (free-model rate limit — wait a bit or pick another free model)';
    throw new Error(`OpenRouter error: ${detail}`);
  }

  const body = await res.json();
  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned an empty response (the free model may be busy — try again).');
  return content;
}

async function callGemini(input: GenerateInput): Promise<string> {
  const apiKey = settings.getGeminiKey();
  if (!apiKey) throw new Error('No Gemini API key set. Add your Google AI Studio key first.');

  const model = settings.getGeminiModel();

  // Build content parts: YouTube video links are passed as fileData so Gemini
  // can actually watch them; non-YouTube links fall back to text references.
  const videoParts: unknown[] = [];
  const textOnlyLinks: string[] = [];
  for (const link of input.videoLinks) {
    if (isYouTubeUrl(link)) {
      videoParts.push({ fileData: { mimeType: 'video/mp4', fileUri: link } });
    } else {
      textOnlyLinks.push(link);
    }
  }

  const textInput: GenerateInput = { ...input, videoLinks: textOnlyLinks };
  const textParts: unknown[] = [{ text: buildPrompt(textInput) }];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: MOSIM_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [...videoParts, ...textParts] }],
        generationConfig: { maxOutputTokens: 16000 },
      }),
    }
  );

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try { const b = await res.json(); detail = b?.error?.message ?? detail; } catch { /* keep */ }
    throw new Error(`Gemini API error: ${detail}`);
  }

  const body = await res.json();
  return (body?.candidates?.[0]?.content?.parts as { text?: string }[] | undefined)
    ?.map((p) => p.text ?? '')
    .join('') ?? '';
}

/** Generate via whichever provider is selected. Throws readable Errors. */
export async function generateScript(input: GenerateInput): Promise<string> {
  const provider = settings.getProvider();
  if (provider === 'gemini') return callGemini(input);
  const prompt = buildPrompt(input);
  if (provider === 'ollama') return callOllama(prompt);
  if (provider === 'openrouter') return callOpenRouter(prompt);
  return callAnthropic(prompt);
}

/** True when the currently selected provider has enough config to be called. */
export function providerConfigured(): boolean {
  const p = settings.getProvider();
  if (p === 'anthropic') return !!settings.getApiKey();
  if (p === 'gemini') return !!settings.getGeminiKey();
  if (p === 'openrouter') return !!settings.getOpenRouterKey();
  return true; // ollama needs no key; the call itself errors if unreachable
}

const ANALYZE_PROMPT = `You are documenting a C# robot script for MoSim (a Unity FRC robot simulator).
Read the script and describe what the robot does, as short bullet points.
Rules:
- Only describe behavior that is actually evident in the script (mechanisms, controls, setpoints, scoring actions, climb, autos).
- No code commentary, no style notes, no assumptions beyond the code.
- Plain hyphen bullets, one behavior per line, max ~8 bullets.
- Output ONLY the bullet list, nothing else.`;

/** Plain text-in/text-out Gemini call (no video parts, no script-gen framing). */
async function callGeminiText(prompt: string): Promise<string> {
  const apiKey = settings.getGeminiKey();
  if (!apiKey) throw new Error('No Gemini API key set. Add your Google AI Studio key first.');
  const model = settings.getGeminiModel();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000 },
      }),
    }
  );
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try { const b = await res.json(); detail = b?.error?.message ?? detail; } catch { /* keep */ }
    throw new Error(`Gemini API error: ${detail}`);
  }
  const body = await res.json();
  return (body?.candidates?.[0]?.content?.parts as { text?: string }[] | undefined)
    ?.map((p) => p.text ?? '')
    .join('') ?? '';
}

/** Ask the selected provider for a bullet-point description of a script. */
export async function analyzeScript(name: string, content: string): Promise<string> {
  const prompt = `${ANALYZE_PROMPT}\n\nScript file: ${name}\n\n\`\`\`csharp\n${content.slice(0, 60000)}\n\`\`\``;
  const provider = settings.getProvider();
  let text: string;
  if (provider === 'gemini') {
    text = await callGeminiText(prompt);
  } else if (provider === 'ollama') {
    text = await callOllama(prompt);
  } else if (provider === 'openrouter') {
    text = await callOpenRouter(prompt, 2000);
  } else {
    text = await callAnthropic(prompt);
  }
  return text.trim();
}
