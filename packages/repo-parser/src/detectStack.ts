import type { DetectedStack, PackageJsonLite } from "../../shared/src/types.ts";

export function detectStack(pkg: PackageJsonLite): DetectedStack {
  const dependencyNames = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);

  const has = (...names: string[]) => names.some((name) => dependencyNames.has(name));

  return {
    frontend: [
      ...(has("next") ? ["nextjs"] : []),
      ...(has("react") ? ["react"] : []),
      ...(has("vite") ? ["vite"] : []),
    ],
    backend: [
      ...(has("express") ? ["express"] : []),
      ...(has("fastify") ? ["fastify"] : []),
      ...(has("@nestjs/core") || has("nestjs") ? ["nestjs"] : []),
      ...(has("simple-git") ? ["nodejs-cli"] : []),
    ],
    database: [
      ...(has("prisma") ? ["prisma"] : []),
      ...(has("mongoose") ? ["mongodb"] : []),
      ...(has("pg") || has("postgres") ? ["postgres"] : []),
    ],
    testing: [
      ...(has("vitest") ? ["vitest"] : []),
      ...(has("jest") ? ["jest"] : []),
      ...(has("playwright") || has("@playwright/test") ? ["playwright"] : []),
      ...(has("cypress") ? ["cypress"] : []),
    ],
  };
}
