import fs from "fs-extra";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENTS_BLOCK_BEGIN,
  AGENTS_BLOCK_END,
  mergeManagedBlock
} from "../packages/generators/src/writeAgents.ts";
import { runScan } from "../packages/core/src/runScan.ts";
import { createTempRepo } from "./helpers/tempRepo.ts";

const generated = "## SmritiFlow Memory\n\nRead docs/ai files first.";

describe("mergeManagedBlock", () => {
  it("wraps generated content in markers for new files", () => {
    const merged = mergeManagedBlock(null, generated);

    expect(merged.startsWith(AGENTS_BLOCK_BEGIN)).toBe(true);
    expect(merged).toContain(generated);
    expect(merged.trimEnd().endsWith(AGENTS_BLOCK_END)).toBe(true);
  });

  it("preserves user content without markers and appends the managed block", () => {
    const merged = mergeManagedBlock("# My Agents\n\nKeep this rule.\n", generated);

    expect(merged).toContain("Keep this rule.");
    expect(merged).toContain(AGENTS_BLOCK_BEGIN);
    expect(merged.indexOf("Keep this rule.")).toBeLessThan(merged.indexOf(AGENTS_BLOCK_BEGIN));
  });

  it("replaces only the managed block and keeps surrounding user content", () => {
    const existing = [
      "# My Agents",
      "",
      "Before the block.",
      AGENTS_BLOCK_BEGIN,
      "## SmritiFlow Memory",
      "",
      "old generated content",
      AGENTS_BLOCK_END,
      "",
      "After the block.",
      ""
    ].join("\n");

    const merged = mergeManagedBlock(existing, generated);

    expect(merged).toContain("Before the block.");
    expect(merged).toContain("After the block.");
    expect(merged).toContain(generated);
    expect(merged).not.toContain("old generated content");
    expect(merged.split(AGENTS_BLOCK_BEGIN)).toHaveLength(2);
    expect(merged.split(AGENTS_BLOCK_END)).toHaveLength(2);
  });
});

describe("scan AGENTS.md writing", () => {
  it("preserves hand-written AGENTS.md content and does not duplicate the block", async () => {
    const customContent = "# My Agents\n\nNever delete this section.\n";
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "agents-app" }, null, 2),
      "README.md": "# Agents App\n",
      "AGENTS.md": customContent
    });

    try {
      await runScan(repoRoot);
      await runScan(repoRoot);

      const agentsText = await fs.readFile(path.join(repoRoot, "AGENTS.md"), "utf8");

      expect(agentsText).toContain("Never delete this section.");
      expect(agentsText).toContain("SmritiFlow Memory");
      expect(agentsText.split(AGENTS_BLOCK_BEGIN)).toHaveLength(2);
    } finally {
      await cleanup();
    }
  });
});
