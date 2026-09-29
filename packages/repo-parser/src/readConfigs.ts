import { isConfigPath, isManifestPath } from "./languages.ts";
import { uniqueSorted } from "../../shared/src/utils.ts";

/**
 * Lists configuration and manifest files from the scanned tree.
 *
 * The previous version checked a hardcoded candidate list at the repository
 * root, so `pnpm-workspace.yaml`, `.gitignore`, `Cargo.toml`, and anything
 * nested below the root were never reported.
 */
export async function readConfigs(repoRoot: string, files: string[] = []): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  return uniqueSorted(files.filter((file) => isConfigPath(file) || isManifestPath(file)));
}
