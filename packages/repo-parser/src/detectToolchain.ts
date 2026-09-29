import path from "node:path";
import fs from "fs-extra";
import type { Toolchain } from "../../shared/src/types.ts";
import { baseName } from "./languages.ts";
import { detectPackageManager } from "./detectPackageManager.ts";

const NODE_MANIFESTS = new Set(["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"]);

async function exists(repoRoot: string, files: string[], name: string): Promise<boolean> {
  if (files.some((file) => baseName(file) === name)) {
    return true;
  }
  return fs.pathExists(path.join(repoRoot, name));
}

interface ToolchainSpec {
  ecosystem: string;
  manager: string;
  install: string;
  test: string | null;
  build: string | null;
  run: string | null;
  markers: string[];
}

const SPECS: ToolchainSpec[] = [
  { ecosystem: "python", manager: "uv", install: "uv sync", test: "pytest", build: null, run: "uvicorn app.main:app --reload", markers: ["uv.lock"] },
  { ecosystem: "python", manager: "poetry", install: "poetry install", test: "poetry run pytest", build: null, run: "poetry run uvicorn app.main:app --reload", markers: ["poetry.lock"] },
  { ecosystem: "python", manager: "pip", install: "pip install -r requirements.txt", test: "pytest", build: null, run: "uvicorn app.main:app --reload", markers: ["requirements.txt", "requirements-dev.txt", "pyproject.toml", "setup.py"] },
  { ecosystem: "go", manager: "go", install: "go mod download", test: "go test ./...", build: "go build ./...", run: "go run .", markers: ["go.mod"] },
  { ecosystem: "rust", manager: "cargo", install: "cargo fetch", test: "cargo test", build: "cargo build --release", run: "cargo run", markers: ["Cargo.toml"] },
  { ecosystem: "ruby", manager: "bundler", install: "bundle install", test: "bundle exec rspec", build: null, run: "bundle exec rails server", markers: ["Gemfile"] },
  { ecosystem: "php", manager: "composer", install: "composer install", test: "composer test", build: null, run: "php artisan serve", markers: ["composer.json"] },
  { ecosystem: "java", manager: "maven", install: "mvn install", test: "mvn test", build: "mvn package", run: "mvn spring-boot:run", markers: ["pom.xml"] },
  { ecosystem: "java", manager: "gradle", install: "gradle build", test: "gradle test", build: "gradle build", run: "gradle bootRun", markers: ["build.gradle", "build.gradle.kts"] },
];

/**
 * Detects the project's real build toolchain. Without this, a Python or Go
 * repository was told to run `npm install`, because the generator assumed a
 * Node package manager existed in every repository.
 */
export async function detectToolchain(
  repoRoot: string,
  files: string[],
  pkg: { scripts?: Record<string, string>; packageManager?: string }
): Promise<Toolchain> {
  const hasNode = files.some((file) => NODE_MANIFESTS.has(baseName(file)));

  if (hasNode) {
    const nodeManager = await detectPackageManager(repoRoot, pkg);
    return {
      ecosystem: "node",
      manager: nodeManager.name,
      install: nodeManager.install,
      run: Object.keys(pkg.scripts ?? {}).length > 0 ? `${nodeManager.run} <script>` : null,
      test: pkg.scripts?.test ? `${nodeManager.run} test` : null,
      build: pkg.scripts?.build ? `${nodeManager.run} build` : null,
    };
  }

  for (const spec of SPECS) {
    for (const marker of spec.markers) {
      if (await exists(repoRoot, files, marker)) {
        return {
          ecosystem: spec.ecosystem,
          manager: spec.manager,
          install: spec.install,
          test: spec.test,
          build: spec.build,
          run: spec.run,
        };
      }
    }
  }

  return { ecosystem: "unknown", manager: "none", install: "", run: null, test: null, build: null };
}
