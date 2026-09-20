import path from "node:path";
import fs from "fs-extra";

export const AGENTS_BLOCK_BEGIN = "<!-- smritiflow:begin -->";
export const AGENTS_BLOCK_END = "<!-- smritiflow:end -->";

/**
 * Replaces only the managed block and preserves everything the user wrote
 * outside it. Existing files without markers keep their content and receive
 * the managed block appended.
 */
export function mergeManagedBlock(existing: string | null, generated: string): string {
  const block = `${AGENTS_BLOCK_BEGIN}\n${generated.trim()}\n${AGENTS_BLOCK_END}\n`;

  if (existing === null || existing.trim().length === 0) {
    return block;
  }

  const start = existing.indexOf(AGENTS_BLOCK_BEGIN);
  const end = existing.indexOf(AGENTS_BLOCK_END);

  if (start !== -1 && end !== -1 && end > start) {
    const before = existing.slice(0, start);
    const after = existing.slice(end + AGENTS_BLOCK_END.length).replace(/^\n/, "");
    return `${before}${block}${after}`;
  }

  return `${existing.trimEnd()}\n\n${block}`;
}

export async function writeAgentsFile(repoRoot: string, generated: string): Promise<void> {
  const agentsPath = path.join(repoRoot, "AGENTS.md");
  const existing = (await fs.pathExists(agentsPath))
    ? await fs.readFile(agentsPath, "utf8")
    : null;

  await fs.writeFile(agentsPath, mergeManagedBlock(existing, generated));
}
