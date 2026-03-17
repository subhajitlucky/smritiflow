import simpleGit from "simple-git";

export async function getChangedFiles(repoRoot: string): Promise<string[]> {
  const git = simpleGit(repoRoot);
  const status = await git.status();

  return [...status.created, ...status.deleted, ...status.modified, ...status.renamed.map((r) => r.to)];
}
