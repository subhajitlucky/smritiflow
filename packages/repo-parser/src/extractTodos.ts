import path from "node:path";
import fs from "fs-extra";
import { uniqueSorted } from "../../shared/src/utils.ts";
import { isDocumentationPath, isSourcePath, isTestPath } from "./languages.ts";
import type { TodoItem } from "../../shared/src/types.ts";

const TODO_RE = /\b(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)\b[:\s-]*([^\n\r*]{0,160})/;

const MAX_TODOS = 200;
const MAX_FILES = 4000;

/**
 * Extracts TODO-style markers with file and line numbers. This replaces the
 * `no TODO extraction yet` placeholder that previously shipped in every
 * generated CURRENT_STATE document.
 */
export async function extractTodos(repoRoot: string, files: string[]): Promise<TodoItem[]> {
  const candidates = files.filter(
    (file) => (isSourcePath(file) || isDocumentationPath(file)) && !isTestPath(file)
  );

  const todos: TodoItem[] = [];

  for (const file of candidates.slice(0, MAX_FILES)) {
    if (todos.length >= MAX_TODOS) {
      break;
    }

    let content: string;
    try {
      content = await fs.readFile(path.join(repoRoot, file), "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const match = TODO_RE.exec(lines[index]);

      if (!match) {
        continue;
      }

      const text = (match[2] ?? "").trim().replace(/\*\/\s*$/, "").trim();
      if (text.length === 0) {
        continue;
      }

      todos.push({ file, line: index + 1, tag: match[1], text: text.slice(0, 160) });

      if (todos.length >= MAX_TODOS) {
        break;
      }
    }
  }

  return todos;
}

export function groupTodosByFile(todos: TodoItem[]): Array<[string, TodoItem[]]> {
  const grouped = new Map<string, TodoItem[]>();

  for (const todo of todos) {
    const existing = grouped.get(todo.file) ?? [];
    existing.push(todo);
    grouped.set(todo.file, existing);
  }

  return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function summarizeTodoTags(todos: TodoItem[]): string[] {
  return uniqueSorted(todos.map((todo) => todo.tag));
}
