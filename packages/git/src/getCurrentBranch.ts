import simpleGit from "simple-git";

export async function getCurrentBranch(repoRoot: string): Promise<string> {
  try {
    const git = simpleGit(repoRoot);
    const branch = await git.branchLocal();
    return branch.current || "unknown";
  } catch {
    return "unknown";
  }
}
