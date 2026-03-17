import simpleGit from "simple-git";

export async function getLastCommit(repoRoot: string): Promise<string> {
  const git = simpleGit(repoRoot);
  const log = await git.log({ maxCount: 1 });
  return log.latest?.hash ?? "unknown";
}
