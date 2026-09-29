import { describe, expect, it } from "vitest";
import { detectStack } from "../packages/repo-parser/src/detectStack.ts";

describe("detectStack", () => {
  it("detects stack categories from a javascript dependency list", () => {
    const detected = detectStack([
      "next",
      "react",
      "express",
      "prisma",
      "pg",
      "vitest",
    ]);

    expect(detected.frontend).toContain("nextjs");
    expect(detected.frontend).toContain("react");
    expect(detected.backend).toContain("express");
    expect(detected.database).toContain("prisma");
    expect(detected.database).toContain("postgres");
    expect(detected.testing).toContain("vitest");
  });

  it("detects a python stack", () => {
    const detected = detectStack(["fastapi", "sqlalchemy", "psycopg2", "pytest", "pydantic"]);

    expect(detected.backend).toContain("fastapi");
    expect(detected.database).toContain("sqlalchemy");
    expect(detected.database).toContain("postgres");
    expect(detected.testing).toContain("pytest");
  });

  it("detects go and rust stacks", () => {
    expect(detectStack(["gin-gonic", "migrate"]).backend).toContain("gin");
    expect(detectStack(["gin-gonic", "migrate"]).database).toContain("golang-migrate");
    expect(detectStack(["axum", "sqlx"]).backend).toContain("axum");
    expect(detectStack(["axum", "sqlx"]).database).toContain("rust-sql");
  });

  it("returns empty arrays when nothing matches", () => {
    const detected = detectStack([]);

    expect(detected.frontend).toEqual([]);
    expect(detected.backend).toEqual([]);
    expect(detected.database).toEqual([]);
    expect(detected.testing).toEqual([]);
  });
});
