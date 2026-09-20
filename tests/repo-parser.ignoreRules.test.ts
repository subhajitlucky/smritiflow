import { describe, expect, it } from "vitest";
import { scanTree } from "../packages/repo-parser/src/scanTree.ts";
import { extractRoutes } from "../packages/repo-parser/src/extractRoutes.ts";
import { createTempRepo } from "./helpers/tempRepo.ts";

describe("scanTree ignore rules", () => {
  it("excludes nested build directories, artifact dirs, and gitignored paths", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "ignore-app" }, null, 2),
      ".gitignore": "generated/\n*.local.ts\n",
      "src/index.ts": "export const value = 1;\n",
      "generated/output.ts": "export const generated = 1;\n",
      "src/secrets.local.ts": "export const secret = 1;\n",
      "node_modules/pkg/index.ts": "export const dep = 1;\n",
      "apps/web/node_modules/pkg/index.ts": "export const dep = 1;\n",
      "apps/web/dist/bundle.js": "console.log('built');\n",
      "docs/ai/CURRENT_STATE.md": "# Current State\n",
      ".smritiflow/cache.json": "{}",
      ".github/workflows/ci.yml": "name: CI\n",
    });

    try {
      const files = await scanTree(repoRoot);

      expect(files).toContain("src/index.ts");
      expect(files).toContain(".github/workflows/ci.yml");
      expect(files).not.toContain("generated/output.ts");
      expect(files).not.toContain("src/secrets.local.ts");
      expect(files).not.toContain("node_modules/pkg/index.ts");
      expect(files).not.toContain("apps/web/node_modules/pkg/index.ts");
      expect(files).not.toContain("apps/web/dist/bundle.js");
      expect(files).not.toContain("docs/ai/CURRENT_STATE.md");
      expect(files).not.toContain(".smritiflow/cache.json");
    } finally {
      await cleanup();
    }
  });

  it("ignores gitignored routes and nested build output", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      ".gitignore": "legacy/\n",
      "src/app/page.tsx": "export default function Page() { return null; }\n",
      "src/app/about/page.tsx": "export default function About() { return null; }\n",
      "legacy/app/old/page.tsx": "export default function Old() { return null; }\n",
      "apps/web/node_modules/pkg/app/page.tsx": "export default function Dep() { return null; }\n",
    });

    try {
      const routes = await extractRoutes(repoRoot);

      expect(routes).toContain("/");
      expect(routes).toContain("/about");
      expect(routes).not.toContain("/old");
    } finally {
      await cleanup();
    }
  });
});
