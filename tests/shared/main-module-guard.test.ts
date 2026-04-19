import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { isMainModule } from "../../src/server.js";

test("isMainModule returns true for equivalent normalized paths", () => {
  const filePath = resolve("/tmp", "oauther", "server.mjs");
  const moduleUrl = pathToFileURL(join("/tmp", "oauther", ".", "server.mjs")).href;
  const result = isMainModule(moduleUrl, filePath);
  assert.equal(result, true);
});

test("isMainModule returns false when paths differ", () => {
  const moduleUrl = pathToFileURL(resolve("/tmp", "oauther", "server.mjs")).href;
  const result = isMainModule(moduleUrl, resolve("/tmp", "oauther", "worker.mjs"));
  assert.equal(result, false);
});

test("isMainModule returns false when argv1 is missing", () => {
  const moduleUrl = pathToFileURL(resolve("/tmp", "oauther", "server.mjs")).href;
  const result = isMainModule(moduleUrl, undefined);
  assert.equal(result, false);
});

test("isMainModule returns false when argv1 is empty", () => {
  const moduleUrl = pathToFileURL(resolve("/tmp", "oauther", "server.mjs")).href;
  const result = isMainModule(moduleUrl, "");
  assert.equal(result, false);
});
