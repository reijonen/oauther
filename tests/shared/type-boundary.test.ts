import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import test from "node:test";

function listTsFiles(root: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...listTsFiles(fullPath));
    } else if (entry.isFile() && extname(entry.name) === ".ts") {
      results.push(fullPath);
    }
  }
  return results;
}

function normalizePath(pathValue: string): string {
  return pathValue.replace(/\\/g, "/");
}

function findTypeDeclarationLines(content: string): string[] {
  const lines = content.split("\n");
  return lines.filter((line) => /^\s*(export\s+)?(type|interface)\s+[A-Za-z_][A-Za-z0-9_]*\b/.test(line));
}

test("type/interface declarations are only in *-types.ts or *.d.ts files", () => {
  const projectRoot = process.cwd();
  const files = [
    ...listTsFiles(join(projectRoot, "src")),
    ...listTsFiles(join(projectRoot, "tests")),
  ];

  for (const file of files) {
    const normalized = normalizePath(file);
    if (normalized.endsWith(".d.ts")) {
      continue;
    }
    if (basename(file).endsWith("-types.ts")) {
      continue;
    }

    const content = readFileSync(file, "utf8");
    const declarationLines = findTypeDeclarationLines(content);
    assert.equal(
      declarationLines.length,
      0,
      `type/interface declaration found in non-types file: ${normalized}\n${declarationLines.join("\n")}`,
    );
  }
});

test("core shared types are declared exactly once in expected files", () => {
  const projectRoot = process.cwd();
  const files = [
    ...listTsFiles(join(projectRoot, "src")),
    ...listTsFiles(join(projectRoot, "tests")),
  ];

  const expectedByType = new Map<string, string>([
    ["VerifyToken", "src/shared/auth-types.ts"],
    ["Config", "src/shared/config-types.ts"],
    ["ExpressMiddleware", "src/shared/express-types.ts"],
    ["AuthLogContext", "src/shared/logging-types.ts"],
  ]);

  for (const [typeName, expectedFile] of expectedByType) {
    const declarationPattern = new RegExp(
      `^\\s*(export\\s+)?(type|interface)\\s+${typeName}\\b`,
      "m",
    );
    const matches: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (declarationPattern.test(content)) {
        matches.push(normalizePath(file));
      }
    }

    const normalizedExpected = normalizePath(join(projectRoot, expectedFile));
    assert.deepEqual(
      matches,
      [normalizedExpected],
      `expected exactly one declaration for ${typeName} in ${expectedFile}, found: ${matches.join(", ")}`,
    );
  }
});
