import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateEvent, CONTEXT_ID_RE } from "../src/lib/validate.mjs";
import {
  assertActiveKnown,
  latestActive,
  latestContexts,
  latestPins,
  regenerateCurrent,
} from "../src/lib/events.mjs";

function baseEvent(over = {}) {
  return {
    id: "2026-09-14T12-00-00Z-t",
    at: "2026-09-14T12:00:00.000Z",
    kind: "note",
    summary: "test",
    next: "next",
    ...over,
  };
}

describe("validateEvent contexts/active", () => {
  it("accepts home pins, contexts, and active", () => {
    validateEvent(
      baseEvent({
        pins: { plan: ".ledger/x/plan.md", commit: "abc" },
        contexts: [
          {
            id: "consumer",
            kind: "app",
            label: "traveller-portal",
            pins: { path: "/apps/tp", commit: "def" },
          },
        ],
        active: ["consumer"],
      }),
    );
  });

  it("rejects pins as array", () => {
    assert.throws(
      () => validateEvent(baseEvent({ pins: ["a"] })),
      /pins must be an object/,
    );
  });

  it("rejects bad context id", () => {
    assert.throws(
      () =>
        validateEvent(
          baseEvent({
            contexts: [{ id: "Bad Id", kind: "app", pins: { a: "1" } }],
          }),
        ),
      /contexts\[0\]\.id/,
    );
  });

  it("rejects nested object in context.pins", () => {
    assert.throws(
      () =>
        validateEvent(
          baseEvent({
            contexts: [
              {
                id: "consumer",
                kind: "app",
                pins: { nested: { x: "1" } },
              },
            ],
          }),
        ),
      /must be a string/,
    );
  });

  it("rejects contexts not an array", () => {
    assert.throws(
      () => validateEvent(baseEvent({ contexts: { id: "x" } })),
      /contexts must be an array/,
    );
  });

  it("CONTEXT_ID_RE matches ledger-name spirit", () => {
    assert.equal(CONTEXT_ID_RE.test("consumer"), true);
    assert.equal(CONTEXT_ID_RE.test("local_pkgs"), true);
    assert.equal(CONTEXT_ID_RE.test("migration-exp"), true);
    assert.equal(CONTEXT_ID_RE.test("Consumer"), false);
  });
});

describe("latestContexts / latestActive / latestPins", () => {
  const e1 = baseEvent({
    id: "1",
    pins: { plan: "p1", branch: "b1", commit: "c1" },
    contexts: [
      {
        id: "consumer",
        kind: "app",
        label: "tp",
        pins: { path: "/tp", commit: "old" },
      },
      {
        id: "local_pkgs",
        kind: "packages",
        pins: { transcript: "1.0" },
      },
    ],
    active: ["consumer"],
  });
  const e2 = baseEvent({
    id: "2",
    contexts: [
      {
        id: "consumer",
        kind: "app",
        label: "partner-portal",
        pins: { path: "/pp", commit: "new" },
      },
    ],
    active: ["consumer", "local_pkgs"],
  });
  const e3 = baseEvent({
    id: "3",
    pins: { plan: "p1", branch: "b1", commit: "c2" },
    // no contexts, no active
  });

  it("merges contexts by id; last definition wins", () => {
    const merged = latestContexts([e1, e2, e3]);
    assert.equal(merged.length, 2);
    const consumer = merged.find((c) => c.id === "consumer");
    assert.equal(consumer.label, "partner-portal");
    assert.equal(consumer.pins.commit, "new");
    const pkgs = merged.find((c) => c.id === "local_pkgs");
    assert.equal(pkgs.pins.transcript, "1.0");
  });

  it("latestActive uses last event that sets active; default []", () => {
    assert.deepEqual(latestActive([]), []);
    assert.deepEqual(latestActive([e1]), ["consumer"]);
    assert.deepEqual(latestActive([e1, e2]), ["consumer", "local_pkgs"]);
    assert.deepEqual(latestActive([e1, e2, e3]), ["consumer", "local_pkgs"]);
  });

  it("latestPins replaces on last event with pins", () => {
    assert.deepEqual(latestPins([e1, e2, e3]), {
      plan: "p1",
      branch: "b1",
      commit: "c2",
    });
  });

  it("assertActiveKnown fails on unknown id", () => {
    assert.throws(
      () =>
        assertActiveKnown([
          baseEvent({
            id: "x",
            active: ["missing"],
          }),
        ]),
      /unknown after merge/,
    );
  });

  it("assertActiveKnown passes when active refers to merged ids", () => {
    assertActiveKnown([e1, e2]);
  });
});

describe("regenerateCurrent contexts section", () => {
  it("writes Contexts and Active into CURRENT.md", () => {
    const dir = mkdtempSync(join(tmpdir(), "ledger-test-"));
    const current = join(dir, "CURRENT.md");
    const events = [
      baseEvent({
        id: "1",
        pins: { branch: "feat/x", commit: "abc" },
        contexts: [
          {
            id: "consumer",
            kind: "app",
            label: "traveller-portal",
            pins: { path: "/tp" },
          },
        ],
        active: ["consumer"],
      }),
    ];
    regenerateCurrent({
      paths: { current },
      meta: { name: "demo", title: "Demo", planRel: ".ledger/demo/plan.md" },
      events,
    });
    const text = readFileSync(current, "utf8");
    assert.match(text, /## Contexts/);
    assert.match(text, /\*\*consumer \(traveller-portal\)\*\*/);
    assert.match(text, /\*\*Active:\*\* consumer/);
    assert.match(text, /## Metadata/);
    assert.match(text, /\*\*branch:\*\* feat\/x/);
  });
});
