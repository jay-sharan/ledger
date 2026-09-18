import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readLedgerYaml,
  setLedgerYamlValue,
} from "../src/lib/paths.mjs";

describe("setLedgerYamlValue", () => {
  it("sets and updates autopilot without dropping other keys", () => {
    const dir = mkdtempSync(join(tmpdir(), "ledger-yaml-"));
    const path = join(dir, "ledger.yaml");
    writeFileSync(
      path,
      "name: demo\ntitle: Demo\n# comment\nautopilot: false\nautoCheckpoint: false\n",
      "utf8",
    );

    setLedgerYamlValue(path, "autopilot", true);
    let cfg = readLedgerYaml(path);
    assert.equal(cfg.autopilot, true);
    assert.equal(cfg.name, "demo");
    assert.equal(cfg.autoCheckpoint, false);
    assert.match(readFileSync(path, "utf8"), /# comment/);

    setLedgerYamlValue(path, "autopilot", false);
    cfg = readLedgerYaml(path);
    assert.equal(cfg.autopilot, false);
  });

  it("appends missing key", () => {
    const dir = mkdtempSync(join(tmpdir(), "ledger-yaml-"));
    const path = join(dir, "ledger.yaml");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, "name: demo\n", "utf8");
    setLedgerYamlValue(path, "autopilot", true);
    assert.equal(readLedgerYaml(path).autopilot, true);
  });
});
