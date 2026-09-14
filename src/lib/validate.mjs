export const KINDS = new Set([
  "scaffold",
  "approve",
  "run",
  "counterexample",
  "converge",
  "decision_link",
  "note",
]);

/** Same spirit as ledger names; lowercase ids for contexts. */
export const CONTEXT_ID_RE = /^[a-z0-9][a-z0-9_-]*$/;

function assertStringPins(pins, label) {
  if (typeof pins !== "object" || pins === null || Array.isArray(pins)) {
    throw new Error(`${label} must be an object`);
  }
  for (const [k, v] of Object.entries(pins)) {
    if (typeof v !== "string") {
      throw new Error(`${label}.${k} must be a string (no nested objects)`);
    }
  }
}

function validateContext(ctx, index) {
  const label = `contexts[${index}]`;
  if (typeof ctx !== "object" || ctx === null || Array.isArray(ctx)) {
    throw new Error(`${label} must be an object`);
  }
  if (typeof ctx.id !== "string" || !CONTEXT_ID_RE.test(ctx.id)) {
    throw new Error(
      `${label}.id must match ${CONTEXT_ID_RE} (got ${JSON.stringify(ctx.id)})`,
    );
  }
  if (typeof ctx.kind !== "string" || !ctx.kind.trim()) {
    throw new Error(`${label}.kind must be a non-empty string`);
  }
  if (ctx.label !== undefined && typeof ctx.label !== "string") {
    throw new Error(`${label}.label must be a string when present`);
  }
  if (ctx.pins === undefined) {
    throw new Error(`${label}.pins is required`);
  }
  assertStringPins(ctx.pins, `${label}.pins`);
}

/**
 * Shape-check one progress event. Does not resolve active against history —
 * call assertActiveKnown (events.mjs) after merge for that.
 */
export function validateEvent(event) {
  for (const key of ["id", "at", "kind", "summary", "next"]) {
    if (typeof event[key] !== "string" || !event[key].trim()) {
      throw new Error(`Missing or empty string field: ${key}`);
    }
  }
  if (!KINDS.has(event.kind)) {
    throw new Error(
      `Invalid kind: ${event.kind}. Allowed: ${[...KINDS].join(", ")}`,
    );
  }
  if (event.summary.length > 280 || event.next.length > 280) {
    throw new Error("summary and next must be ≤ 280 characters");
  }
  if (event.pins !== undefined) {
    if (typeof event.pins !== "object" || Array.isArray(event.pins)) {
      throw new Error("pins must be an object");
    }
  }
  if (event.contexts !== undefined) {
    if (!Array.isArray(event.contexts)) {
      throw new Error("contexts must be an array");
    }
    event.contexts.forEach((ctx, i) => validateContext(ctx, i));
  }
  if (event.active !== undefined) {
    if (!Array.isArray(event.active)) {
      throw new Error("active must be an array");
    }
    for (const [i, id] of event.active.entries()) {
      if (typeof id !== "string" || !CONTEXT_ID_RE.test(id)) {
        throw new Error(
          `active[${i}] must match ${CONTEXT_ID_RE} (got ${JSON.stringify(id)})`,
        );
      }
    }
  }
  if (event.artifacts !== undefined && !Array.isArray(event.artifacts)) {
    throw new Error("artifacts must be an array");
  }
  if (event.run !== undefined) {
    if (typeof event.run !== "object" || Array.isArray(event.run)) {
      throw new Error("run must be an object");
    }
  }
}
