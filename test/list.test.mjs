import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "bin", "ledger.mjs");

describe("ledger list", () => {
  it("prints name and title columns", () => {
    const dir = mkdtempSync(join(tmpdir(), "ledger-list-"));
    mkdirSync(join(dir, ".ledger", "alpha"), { recursive: true });
    mkdirSync(join(dir, ".ledger", "beta"), { recursive: true });
    writeFileSync(
      join(dir, ".ledger", "alpha", "ledger.yaml"),
      "name: alpha\ntitle: Alpha Feature\nautopilot: false\n",
      "utf8",
    );
    writeFileSync(
      join(dir, ".ledger", "beta", "ledger.yaml"),
      "name: beta\ntitle: Beta Work\nautopilot: false\n",
      "utf8",
    );
    // Shared starters folder also has a ledger.yaml template — must not list as a ledger
    mkdirSync(join(dir, ".ledger", "templates"), { recursive: true });
    writeFileSync(
      join(dir, ".ledger", "templates", "ledger.yaml"),
      "name: {{name}}\ntitle: {{title}}\n",
      "utf8",
    );
    writeFileSync(
      join(dir, ".ledger", "alpha", "progress.jsonl"),
      `${JSON.stringify({
        id: "e1",
        at: "2026-09-14T12:00:00Z",
        kind: "run",
        concern: "U001",
        summary: "did stuff",
        next: "run U002 (commit before next)",
      })}\n`,
      "utf8",
    );
    writeFileSync(join(dir, ".ledger", "beta", "progress.jsonl"), "", "utf8");

    const r = spawnSync(process.execPath, [bin, "list"], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /NAME\s+CURRENT\s+NEXT\s+TITLE/);
    assert.match(r.stdout, /alpha\s+U001\s+U002\s+Alpha Feature/);
    assert.match(r.stdout, /beta\s+Done\s+Beta Work/);
    assert.doesNotMatch(r.stdout, /templates/);
  });
});
