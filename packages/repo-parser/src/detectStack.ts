import type { DetectedStack } from "../../shared/src/types.ts";

/**
 * Maps known dependency names to stack labels. Accepts dependencies from any
 * manifest, so Python, Go, Rust, Ruby, and PHP projects are described as well
 * as JavaScript ones instead of every section reporting "none detected".
 */
export function detectStack(dependencyNames: string[]): DetectedStack {
  const names = new Set(dependencyNames);
  const has = (...candidates: string[]): boolean => candidates.some((name) => names.has(name));
  const list = (...candidates: string[]): string[] => (has(...candidates) ? candidates : []);

  return {
    frontend: [
      ...list("next").map(() => "nextjs"),
      ...list("react").map(() => "react"),
      ...list("vue").map(() => "vue"),
      ...list("svelte").map(() => "svelte"),
      ...list("vite").map(() => "vite"),
    ],
    backend: [
      ...list("express").map(() => "express"),
      ...list("fastify").map(() => "fastify"),
      ...list("hapi").map(() => "hapi"),
      ...list("@nestjs/core", "nestjs").map(() => "nestjs"),
      ...list("fastapi").map(() => "fastapi"),
      ...list("flask").map(() => "flask"),
      ...list("django").map(() => "django"),
      ...list("gin-gonic", "gin").map(() => "gin"),
      ...list("echo").map(() => "echo"),
      ...list("axum").map(() => "axum"),
      ...list("actix-web").map(() => "actix-web"),
      ...list("rails").map(() => "rails"),
      ...list("laravel/framework").map(() => "laravel"),
      ...list("simple-git").map(() => "nodejs-cli"),
      ...list("commander", "yargs", "oclif").map(() => "nodejs-cli"),
    ],
    database: [
      ...list("prisma").map(() => "prisma"),
      ...list("mongoose").map(() => "mongodb"),
      ...list("pg", "postgres", "psycopg2", "psycopg", "asyncpg").map(() => "postgres"),
      ...list("mysql2", "pymysql", "mysql-connector-python").map(() => "mysql"),
      ...list("sqlite3", "aiosqlite").map(() => "sqlite"),
      ...list("sqlalchemy").map(() => "sqlalchemy"),
      ...list("diesel", "sqlx").map(() => "rust-sql"),
      ...list("migrate").map(() => "golang-migrate"),
    ],
    testing: [
      ...list("vitest").map(() => "vitest"),
      ...list("jest").map(() => "jest"),
      ...list("mocha").map(() => "mocha"),
      ...list("@playwright/test", "playwright").map(() => "playwright"),
      ...list("cypress").map(() => "cypress"),
      ...list("pytest").map(() => "pytest"),
      ...list("@testing-library/react").map(() => "testing-library"),
    ],
  };
}
