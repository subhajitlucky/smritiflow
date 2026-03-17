import fg from "fast-glob";

export async function scanTree(repoRoot: string): Promise<string[]> {
  const files = await fg(["**/*"], {
    cwd: repoRoot,
    dot: false,
    onlyFiles: true,
    ignore: [
      "node_modules/**",
      ".git/**",
      "dist/**",
      ".smritiflow/**",
      "**/.DS_Store",
    ],
  });

  return files.sort((a, b) => a.localeCompare(b));
}
