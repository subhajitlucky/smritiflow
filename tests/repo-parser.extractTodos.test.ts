import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { extractTodos, groupTodosByFile } from "../packages/repo-parser/src/extractTodos.ts";
import { createTempDir } from "./helpers/tempRepo.ts";

describe("extractTodos", () => {
  it("extracts markers with file and line numbers", async () => {
    const dir = await createTempDir("smritiflow-todos-");

    try {
      await fs.outputFile(
        path.join(dir, "src", "a.ts"),
        ["// TODO: wire up the parser", "export const a = 1;", "// FIXME broken"].join("\n")
      );
      await fs.outputFile(
        path.join(dir, "app", "main.py"),
        ["def main():", "    # HACK: temporary", "    return 1"].join("\n")
      );

      const todos = await extractTodos(dir, ["src/a.ts", "app/main.py"]);

      expect(todos).toHaveLength(3);
      expect(todos[0]).toEqual({ file: "src/a.ts", line: 1, tag: "TODO", text: "wire up the parser" });
      expect(todos[1]).toEqual({ file: "src/a.ts", line: 3, tag: "FIXME", text: "broken" });
      expect(todos[2]).toEqual({ file: "app/main.py", line: 2, tag: "HACK", text: "temporary" });
    } finally {
      await fs.remove(dir);
    }
  });

  it("ignores markers with no description", async () => {
    const dir = await createTempDir("smritiflow-todos-empty-");

    try {
      await fs.outputFile(path.join(dir, "a.ts"), "// TODO\nconst x = 1;\n");
      expect(await extractTodos(dir, ["a.ts"])).toEqual([]);
    } finally {
      await fs.remove(dir);
    }
  });

  it("does not treat ordinary prose as a marker", async () => {
    const dir = await createTempDir("smritiflow-todos-prose-");

    try {
      await fs.outputFile(path.join(dir, "a.ts"), "const bug = 1;\n// this is not a marker\n");
      expect(await extractTodos(dir, ["a.ts"])).toEqual([]);
    } finally {
      await fs.remove(dir);
    }
  });

  it("skips files that are missing or unreadable", async () => {
    const dir = await createTempDir("smritiflow-todos-missing-");

    try {
      const todos = await extractTodos(dir, ["src/gone.ts", "package.json"]);
      expect(todos).toEqual([]);
    } finally {
      await fs.remove(dir);
    }
  });

  it("groups markers by file", () => {
    const grouped = groupTodosByFile([
      { file: "b.ts", line: 2, tag: "TODO", text: "second" },
      { file: "a.ts", line: 1, tag: "TODO", text: "first" },
      { file: "b.ts", line: 9, tag: "FIXME", text: "third" },
    ]);

    expect(grouped.map(([file]) => file)).toEqual(["a.ts", "b.ts"]);
    expect(grouped.find(([file]) => file === "b.ts")?.[1]).toHaveLength(2);
  });
});
