import simpleGit from "simple-git";

export async function getRecentCommits(
  repoRoot: string,
  count = 5
): Promise<string[]> {
  const git = simpleGit(repoRoot);
  const log = await git.log({ maxCount: count });

  return log.all.map((entry) => `${entry.hash.slice(0, 7)} ${entry.message}`);
}
