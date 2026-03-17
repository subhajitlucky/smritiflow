import { describe, expect, it } from "vitest";
import { detectStack } from "../packages/repo-parser/src/detectStack.ts";

describe("detectStack", () => {
  it("detects stack categories from dependencies", () => {
    const detected = detectStack({
      dependencies: {
        next: "latest",
        react: "latest",
        express: "latest",
        prisma: "latest",
        pg: "latest",
      },
      devDependencies: {
        vitest: "latest",
      },
    });

    expect(detected.frontend).toContain("nextjs");
    expect(detected.frontend).toContain("react");
    expect(detected.backend).toContain("express");
    expect(detected.database).toContain("prisma");
    expect(detected.database).toContain("postgres");
    expect(detected.testing).toContain("vitest");
  });

  it("returns empty arrays when nothing matches", () => {
    const detected = detectStack({ dependencies: {}, devDependencies: {} });

    expect(detected.frontend).toEqual([]);
    expect(detected.backend).toEqual([]);
    expect(detected.database).toEqual([]);
    expect(detected.testing).toEqual([]);
  });
});
