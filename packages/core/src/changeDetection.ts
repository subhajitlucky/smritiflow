import { isConfigPath, isManifestPath, isReadmePath, isSourcePath } from "../../repo-parser/src/languages.ts";
import { uniqueSorted } from "../../shared/src/utils.ts";

export interface HashDiff {
  changed: string[];
  added: string[];
  removed: string[];
}

export interface ChangeCategories {
  manifestChanged: boolean;
  readmeChanged: boolean;
  configChanged: boolean;
  sourceChanged: boolean;
  structureChanged: boolean;
  docsChanged: boolean;
}

export function diffHashes(
  previous: Record<string, string>,
  current: Record<string, string>
): HashDiff {
  const changed: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  for (const [file, hash] of Object.entries(current)) {
    const previousHash = previous[file];
    if (previousHash === undefined) {
      added.push(file);
    } else if (previousHash !== hash) {
      changed.push(file);
    }
  }

  for (const file of Object.keys(previous)) {
    if (current[file] === undefined) {
      removed.push(file);
    }
  }

  return {
    changed: uniqueSorted(changed),
    added: uniqueSorted(added),
    removed: uniqueSorted(removed),
  };
}

export function classifyChanges(diff: HashDiff): ChangeCategories {
  const touched = [...diff.changed, ...diff.added];

  return {
    manifestChanged: touched.some(isManifestPath),
    readmeChanged: touched.some(isReadmePath),
    configChanged: touched.some(isConfigPath),
    sourceChanged: touched.some(isSourcePath),
    structureChanged: diff.added.length > 0 || diff.removed.length > 0,
    docsChanged: touched.some((file) => /\.(md|mdx|rst|adoc|txt)$/i.test(file)),
  };
}
