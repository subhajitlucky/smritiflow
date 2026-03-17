import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { extractRoutes } from "../packages/repo-parser/src/extractRoutes.ts";
import { createTempDir } from "./helpers/tempRepo.ts";

describe("extractRoutes", () => {
  it("extracts routes from app and pages conventions", async () => {
    const dir = await createTempDir("smritiflow-routes-");

    try {
      await fs.outputFile(`${dir}/src/app/blog/[slug]/page.tsx`, "export default null;\n");
      await fs.outputFile(`${dir}/src/pages/index.tsx`, "export default null;\n");
      await fs.outputFile(`${dir}/src/pages/about.tsx`, "export default null;\n");

      const routes = await extractRoutes(dir);

      expect(routes).toContain("/");
      expect(routes).toContain("/about");
      expect(routes).toContain("/blog/:slug");
    } finally {
      await fs.remove(dir);
    }
  });
});
