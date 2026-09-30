import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
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
    assert.match(r.stdout, /NAME\s+CURRENT\s+NEXT\s+UPDATED\s+TITLE/);
    assert.match(r.stdout, /alpha\s+U001\s+U002\s+\S+ ago\s+Alpha Feature/);
    assert.match(r.stdout, /beta\s+Done\s+just now\s+Beta Work/);
    assert.ok(r.stdout.indexOf("alpha") < r.stdout.indexOf("beta"));
    assert.match(r.stdout, /2 ledgers · 1 active · 1 done/);
    assert.doesNotMatch(r.stdout, /templates/);
  });

  it("-g lists ledgers across sibling git repos", () => {
    const ws = mkdtempSync(join(tmpdir(), "ledger-list-g-"));
    for (const [repo, name] of [
      ["api", "auth"],
      ["web", "checkout"],
    ]) {
      mkdirSync(join(ws, repo, ".git"), { recursive: true });
      mkdirSync(join(ws, repo, ".ledger", name), { recursive: true });
      writeFileSync(
        join(ws, repo, ".ledger", name, "ledger.yaml"),
        `name: ${name}\ntitle: ${name} work\n`,
        "utf8",
      );
    }
    mkdirSync(join(ws, "no-ledger", ".git"), { recursive: true });

    const r = spawnSync(process.execPath, [bin, "list", "-g"], {
      cwd: join(ws, "api"),
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /REPO\s+NAME\s+CURRENT\s+NEXT\s+UPDATED\s+TITLE/);
    assert.match(r.stdout, /api\s+auth\s+Done\s+just now\s+auth work/);
    assert.match(r.stdout, /web\s+checkout\s+Done\s+just now\s+checkout work/);
    assert.doesNotMatch(r.stdout, /no-ledger/);

    const j = spawnSync(process.execPath, [bin, "list", "-g", "--json"], {
      cwd: join(ws, "api"),
      encoding: "utf8",
    });
    assert.equal(j.status, 0, j.stderr);
    const rows = JSON.parse(j.stdout).sort((a, b) => a.repo.localeCompare(b.repo));
    assert.deepEqual(
      rows.map((row) => [row.repo, row.name]),
      [
        ["api", "auth"],
        ["web", "checkout"],
      ],
    );
    assert.equal(
      rows[0].paths.plan,
      join(realpathSync(ws), "api", ".ledger", "auth", "plan.md"),
    );

    const fromWs = spawnSync(process.execPath, [bin, "list", "-g"], {
      cwd: ws,
      encoding: "utf8",
    });
    assert.equal(fromWs.status, 0, fromWs.stderr);
    assert.match(fromWs.stdout, /api\s+auth/);
    assert.match(fromWs.stdout, /web\s+checkout/);
  });
});
