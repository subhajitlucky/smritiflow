import simpleGit from "simple-git";
import { GENERATED_FILES } from "../../shared/src/constants.ts";
import { uniqueSorted } from "../../shared/src/utils.ts";

const IGNORED_PREFIXES = ["node_modules/", ".smritiflow/", "docs/ai/"];
const GENERATED_FILE_SET = new Set(
  GENERATED_FILES.map((filePath) => filePath.replaceAll("\\", "/"))
);

function shouldTrackChangedFile(filePath: string): boolean {
  const normalized = filePath.replaceAll("\\", "/");

  if (IGNORED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }

  if (GENERATED_FILE_SET.has(normalized)) {
    return false;
  }

  return true;
}

export async function getChangedFiles(repoRoot: string): Promise<string[]> {
  try {
    const git = simpleGit(repoRoot);
    const status = await git.status();

    const changed = [
      ...status.created,
      ...status.deleted,
      ...status.modified,
      ...status.renamed.map((r) => r.to),
      ...status.not_added,
    ];

    return uniqueSorted(changed.filter(shouldTrackChangedFile));
  } catch {
    return [];
  }
}
