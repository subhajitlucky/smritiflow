import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { extractRoutes } from "../packages/repo-parser/src/extractRoutes.ts";
import { createTempDir } from "./helpers/tempRepo.ts";

describe("extractRoutes", () => {
  it("extracts routes from app and pages conventions", async () => {
    const dir = await createTempDir("smritiflow-routes-");

    try {
      await fs.outputFile(`${dir}/src/app/blog/[slug]/page.tsx`, "export default null;\n");
      await fs.outputFile(
        `${dir}/src/app/(marketing)/docs/[...slug]/page.tsx`,
        "export default null;\n"
      );
      await fs.outputFile(`${dir}/src/pages/index.tsx`, "export default null;\n");
      await fs.outputFile(`${dir}/src/pages/about.tsx`, "export default null;\n");
      await fs.outputFile(`${dir}/src/pages/api/health.ts`, "export default null;\n");

      const routes = await extractRoutes(dir);

      expect(routes).toContain("/");
      expect(routes).toContain("/about");
      expect(routes).toContain("/blog/:slug");
      expect(routes).toContain("/docs/:slug*");
      expect(routes.join("\n")).not.toContain("/api/health");
    } finally {
      await fs.remove(dir);
    }
  });

  it("includes Next.js app API routes", async () => {
    const dir = await createTempDir("smritiflow-routes-app-api-");

    try {
      await fs.outputFile(`${dir}/src/app/api/users/route.ts`, "export const GET = () => {};\n");
      const routes = await extractRoutes(dir);
      expect(routes).toContain("/api/users");
    } finally {
      await fs.remove(dir);
    }
  });

  it("extracts FastAPI routes with their HTTP methods", async () => {
    const dir = await createTempDir("smritiflow-routes-fastapi-");

    try {
      await fs.outputFile(
        `${dir}/app/main.py`,
        [
          'from fastapi import FastAPI',
          'app = FastAPI()',
          '@app.get("/users")',
          'async def list_users(): pass',
          '@app.post("/users")',
          'async def create_user(): pass',
        ].join("\n")
      );

      const routes = await extractRoutes(dir);

      expect(routes).toContain("/users [GET, POST]");
    } finally {
      await fs.remove(dir);
    }
  });

  it("extracts Express routes", async () => {
    const dir = await createTempDir("smritiflow-routes-express-");

    try {
      await fs.outputFile(
        `${dir}/src/server.ts`,
        ['app.get("/health", handler);', 'router.post("/orders", handler);'].join("\n")
      );

      const routes = await extractRoutes(dir);

      expect(routes).toContain("/health [GET]");
      expect(routes).toContain("/orders [POST]");
    } finally {
      await fs.remove(dir);
    }
  });

  it("extracts Spring annotations", async () => {
    const dir = await createTempDir("smritiflow-routes-spring-");

    try {
      await fs.outputFile(
        `${dir}/src/main/java/Controller.java`,
        ['@GetMapping("/items")', "public List<Item> items() { return null; }"].join("\n")
      );

      expect(await extractRoutes(dir)).toContain("/items [GET]");
    } finally {
      await fs.remove(dir);
    }
  });

  it("extracts Go http routes", async () => {
    const dir = await createTempDir("smritiflow-routes-go-");

    try {
      await fs.outputFile(
        `${dir}/main.go`,
        [
          "package main",
          'import "net/http"',
          "func main() {",
          '\tmux.HandleFunc("/health", handler)',
          '\tmux.Handle("/items", items)',
          "}",
        ].join("\n")
      );

      const routes = await extractRoutes(dir);

      expect(routes).toContain("/health");
      expect(routes).toContain("/items");
    } finally {
      await fs.remove(dir);
    }
  });

  it("ignores route declarations that only appear in comments", async () => {
    const dir = await createTempDir("smritiflow-routes-comments-");

    try {
      await fs.outputFile(
        `${dir}/src/server.ts`,
        [
          "/**",
          ' * Registers `app.get("/documented")` for the health probe.',
          " * @RequestMapping(\"/also-documented\")",
          " */",
          'app.get("/real", handler);',
        ].join("\n")
      );

      expect(await extractRoutes(dir)).toEqual(["/real [GET]"]);
    } finally {
      await fs.remove(dir);
    }
  });

  it("ignores route declarations inside test fixtures", async () => {
    const dir = await createTempDir("smritiflow-routes-fixture-");

    try {
      await fs.outputFile(`${dir}/tests/server.test.ts`, 'app.get("/fixture-only", h);\n');
      await fs.outputFile(`${dir}/src/server.ts`, 'app.get("/real", h);\n');

      expect(await extractRoutes(dir)).toEqual(["/real [GET]"]);
    } finally {
      await fs.remove(dir);
    }
  });

  it("returns an empty list for a repository with no routes", async () => {
    const dir = await createTempDir("smritiflow-routes-none-");

    try {
      await fs.outputFile(`${dir}/index.js`, "console.log(1);\n");
      expect(await extractRoutes(dir)).toEqual([]);
    } finally {
      await fs.remove(dir);
    }
  });
});
