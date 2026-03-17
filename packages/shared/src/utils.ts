import crypto from "node:crypto";
import path from "node:path";
import fs from "fs-extra";

export function nowIso(): string {
  return new Date().toISOString();
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export async function sha256File(filePath: string): Promise<string | null> {
  if (!(await fs.pathExists(filePath))) {
    return null;
  }

  const content = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function topLevelArea(filePath: string): string {
  const normalized = filePath.split(path.sep).join("/");
  const [head] = normalized.split("/");
  return head || ".";
}
