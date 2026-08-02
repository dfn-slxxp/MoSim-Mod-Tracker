// ---------------------------------------------------------------------------
// Builds a self-contained, paste-anywhere PROMPT for generating a MoSim robot
// script — no AI call happens here. The prompt bundles:
//   1. Directions specific to this robot (what to build, what rules to follow)
//   2. The RobotFramework source (reference only — the real, authoritative API)
//   3. The team's real GitHub robot code (reference only — what to translate)
//   4. Links to the user's saved library scripts (reference only, fetched via
//      the public /api/scripts/:id/raw endpoint instead of pasted inline, to
//      keep the prompt short)
// The result is meant to be copied into ANY AI model's chat box as-is.
// ---------------------------------------------------------------------------
import { MOSIM_SYSTEM_PROMPT } from './reference';

export interface PromptScriptLink {
  name: string;
  url: string;
}

/** A named group of reference source files embedded inline (e.g. RobotFramework, this repo's other scripts). */
export interface ReferenceGroup {
  heading: string;
  note: string;
  files: Record<string, string>;
}

export interface PromptInput {
  robotName: string;
  team: string;
  game: string;
  description: string;
  /** The team's real robot code (translation source), keyed by repo-relative path. */
  sourceRepo?: { url: string; files: Record<string, string> };
  /** Extra inline reference source groups (e.g. local RobotFramework checkout, other repo scripts). */
  referenceGroups?: ReferenceGroup[];
  /** Library scripts to reference by link rather than inline content. */
  scriptLinks: PromptScriptLink[];
}

function fileBlock(path: string, content: string, cap = 40_000): string {
  const lang = path.split('.').pop() ?? '';
  return `\n### ${path}\n\`\`\`${lang}\n${content.slice(0, cap)}\n\`\`\``;
}

export function buildRobotPrompt(input: PromptInput): string {
  const hasRepo = !!input.sourceRepo && Object.keys(input.sourceRepo.files).length > 0;
  const referenceGroups = (input.referenceGroups ?? []).filter((g) => Object.keys(g.files).length > 0);

  const parts: string[] = [];

  parts.push(
    `# MoSim robot script request — ${input.team ? input.team + ' ' : ''}${input.robotName} (${input.game})`
  );

  parts.push(
    `\n## Task\n` +
      `Write a complete MoSim (Unity/C#) robot mod script for this robot. MoSim is an FRC ` +
      `robot simulator — the script must use ONLY the real RobotFramework API shown in the ` +
      `reference source below, not invented methods. Follow the authoring rules in the ` +
      `"MoSim scripting rules" section exactly (lifecycle methods, input actions, setpoint ` +
      `handling, audio, game-piece controllers). Where the real robot's setpoint numbers ` +
      `(angles, positions, speeds) don't map directly because units differ from MoSim, leave ` +
      `them as clearly marked \`// TODO tune-in-MoSim\` placeholders rather than guessing.`
  );

  parts.push(`\n## MoSim scripting rules (authoritative — follow exactly)\n${MOSIM_SYSTEM_PROMPT}`);

  parts.push(`\n## What this robot needs to do`);
  if (input.description.trim()) {
    parts.push(input.description.trim());
  } else if (hasRepo) {
    parts.push(
      `(No manual description — see the team's real robot source in the reference section below. ` +
        `Study its subsystems, mechanisms, motors, sensors, and control logic, then recreate the ` +
        `robot's behavior as a single MoSim C# robot script.)`
    );
  } else {
    parts.push('(none provided)');
  }

  parts.push(
    `\n---\n# Reference material below (context only)\n` +
      `Everything past this point is REFERENCE ONLY — real source code to inform the script above, ` +
      `not something to copy verbatim. Do not treat file paths, namespaces, or class names from the ` +
      `reference material as requirements unless the Task section above says so.`
  );

  const letters = 'ABCDEFGHIJ';
  let li = 0;

  for (const group of referenceGroups) {
    const letter = letters[li++] ?? String(li);
    parts.push(`\n## ${letter}. ${group.heading}\n${group.note}`);
    for (const [path, content] of Object.entries(group.files)) {
      parts.push(fileBlock(path, content));
    }
  }

  if (hasRepo) {
    const letter = letters[li++] ?? String(li);
    parts.push(
      `\n## ${letter}. The team's real robot source (${input.sourceRepo!.url})\n` +
        `The actual FRC team's code for this robot. Study it for which mechanisms exist and how ` +
        `they coordinate — do not copy setpoint numbers directly (see the Task section).`
    );
    for (const [path, content] of Object.entries(input.sourceRepo!.files)) {
      parts.push(fileBlock(path, content));
    }
  }

  if (input.scriptLinks.length > 0) {
    const letter = letters[li++] ?? String(li);
    parts.push(
      `\n## ${letter}. My past MoSim scripts (style/API examples)\n` +
        `Fetch these for reference on my coding style and API usage patterns, if you can access URLs:\n` +
        input.scriptLinks.map((s) => `- ${s.name} — ${s.url}`).join('\n')
    );
  }

  parts.push(`\n---\nGenerate the complete robot script now, ready to paste into MoSim.`);

  return parts.join('\n');
}
