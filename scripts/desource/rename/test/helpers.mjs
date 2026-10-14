import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { bindingKey, collectBindings } from "../lib/bindings.mjs";

export function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "rename-fixture-"));
  mkdirSync(path.join(root, "app/renderer/src"), { recursive: true });
  execFileSync("git", ["init", "-q", root]);
  execFileSync("git", ["-C", root, "config", "user.email", "test@example.invalid"]);
  execFileSync("git", ["-C", root, "config", "user.name", "Test"]);
  return root;
}

export function put(root, relative, source) {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, source);
  return file;
}

export function commitFiles(root) {
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "commit", "-m", "fixture", "-q"]);
}

export function keyFor(source, name, occurrence = 0) {
  const info = collectBindings(source, "fixture.jsx");
  const matches = info.bindings.filter((item) => item.name === name);
  if (!matches[occurrence]) throw new Error(`No binding ${name} at occurrence ${occurrence}`);
  return bindingKey(matches[occurrence]);
}
