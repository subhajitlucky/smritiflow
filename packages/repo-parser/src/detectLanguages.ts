import { languageOf } from "./languages.ts";

/**
 * Counts files per language, most-used first, so generated docs describe the
 * real codebase instead of assuming a JavaScript-only project.
 */
export function detectLanguages(files: string[]): Array<{ language: string; files: number }> {
  const counts = new Map<string, number>();

  for (const file of files) {
    const language = languageOf(file);
    if (!language) {
      continue;
    }
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([language, files]) => ({ language, files }))
    .sort((a, b) => b.files - a.files || a.language.localeCompare(b.language));
}
