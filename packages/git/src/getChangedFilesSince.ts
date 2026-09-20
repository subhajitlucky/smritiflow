import simpleGit from "simple-git";
import { uniqueSorted } from "../../shared/src/utils.ts";

/**
 * Lists files changed between a previously recorded commit and HEAD.
 * Throws when the recorded commit is no longer reachable (for example after a
 * rebase or force-push) so callers can fall back to a full scan.
 */
export async function getChangedFilesSince(
  repoRoot: string,
  sinceCommit: string
): Promise<string[]> {
  const git = simpleGit(repoRoot);
  const output = await git.raw(["diff", "--name-only", `${sinceCommit}..HEAD`]);
  const files = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return uniqueSorted(files);
}
