import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";

describe("cli bin aliases", () => {
  it("exposes both smritiflow and sf binaries", async () => {
    const packageJsonPath = path.join(process.cwd(), "apps", "cli", "package.json");
    const pkg = await fs.readJson(packageJsonPath);

    expect(pkg.bin?.smritiflow).toBe("bin/smritiflow.js");
    expect(pkg.bin?.sf).toBe("bin/smritiflow.js");
  });
});
