import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureProjectTemplates } from "../src/lib/paths.mjs";

describe("ensureProjectTemplates", () => {
  it("copies package templates into .ledger/templates once", () => {
    const root = mkdtempSync(join(tmpdir(), "ledger-tpl-"));
    const first = ensureProjectTemplates(root);
    assert.ok(first.copied.includes("plan-author-prompt.md"));
    assert.ok(first.copied.includes("implementation-plan.md"));
    assert.equal(first.skipped.length, 0);
    assert.ok(
      existsSync(join(root, ".ledger", "templates", "plan-author-prompt.md")),
    );

    const marker = join(root, ".ledger", "templates", "plan-author-prompt.md");
    writeFileSync(marker, "LOCAL EDIT\n", "utf8");

    const second = ensureProjectTemplates(root);
    assert.equal(second.copied.length, 0);
    assert.ok(second.skipped.includes("plan-author-prompt.md"));
    assert.equal(readFileSync(marker, "utf8"), "LOCAL EDIT\n");
  });
});
