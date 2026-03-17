import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import simpleGit from "simple-git";

export async function createTempDir(prefix = "smritiflow-test-"): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function createTempRepo(
  files: Record<string, string>
): Promise<{ repoRoot: string; cleanup: () => Promise<void> }> {
  const repoRoot = await createTempDir("smritiflow-repo-");

  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(repoRoot, relPath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
  }

  const git = simpleGit(repoRoot);
  await git.init();
  await git.addConfig("user.name", "SmritiFlow Tests");
  await git.addConfig("user.email", "tests@smritiflow.local");
  await git.add(".");
  await git.commit("initial commit");

  return {
    repoRoot,
    cleanup: async () => {
      await fs.remove(repoRoot);
    },
  };
}
