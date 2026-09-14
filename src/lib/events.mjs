import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { KINDS, validateEvent } from "./validate.mjs";

export { KINDS, validateEvent };

export function readEvents(jsonlPath) {
  if (!existsSync(jsonlPath)) return [];
  return readFileSync(jsonlPath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

export function appendEvent(jsonlPath, event) {
  validateEvent(event);
  const existing = readEvents(jsonlPath);
  if (existing.some((e) => e.id === event.id)) {
    throw new Error(`Duplicate event id: ${event.id}`);
  }
  assertActiveKnown([...existing, event]);
  appendFileSync(jsonlPath, `${JSON.stringify(event)}\n`, "utf8");
}

/**
 * Home pins: last event that declares any pins wins (full replace).
 * When updating pins, restate the full home set (plan/branch/commit) so assert keeps working.
 */
export function latestPins(events) {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].pins && Object.keys(events[i].pins).length) {
      return { ...events[i].pins };
    }
  }
  return {};
}

/**
 * Merge contexts by id across history. Last definition of an id wins.
 * @returns {Array<{id: string, kind: string, label?: string, pins: Record<string,string>}>}
 */
export function latestContexts(events) {
  const map = new Map();
  for (const e of events) {
    if (!Array.isArray(e.contexts)) continue;
    for (const ctx of e.contexts) {
      const next = {
        id: ctx.id,
        kind: ctx.kind,
        pins: { ...ctx.pins },
      };
      if (typeof ctx.label === "string") next.label = ctx.label;
      map.set(ctx.id, next);
    }
  }
  return [...map.values()];
}

/**
 * Last event that sets `active` wins. If never set, returns [].
 */
export function latestActive(events) {
  for (let i = events.length - 1; i >= 0; i--) {
    if (Array.isArray(events[i].active)) {
      return [...events[i].active];
    }
  }
  return [];
}

/**
 * Fail if any latestActive id is missing from merged latestContexts.
 */
export function assertActiveKnown(eventsIncludingNew) {
  const contexts = latestContexts(eventsIncludingNew);
  const known = new Set(contexts.map((c) => c.id));
  const active = latestActive(eventsIncludingNew);
  for (const id of active) {
    if (!known.has(id)) {
      throw new Error(
        `active context id "${id}" is unknown after merge (known: ${
          known.size ? [...known].join(", ") : "(none)"
        })`,
      );
    }
  }
}

export function lastOfKind(events, kind) {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].kind === kind) return events[i];
  }
  return null;
}

export function jsonlHash(jsonlPath) {
  const raw = existsSync(jsonlPath) ? readFileSync(jsonlPath, "utf8") : "";
  return createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

function formatContextBlock(contexts, active) {
  const lines = ["## Contexts", ""];
  if (contexts.length === 0) {
    lines.push("- *(none recorded yet)*");
  } else {
    for (const ctx of contexts) {
      const title = ctx.label ? `${ctx.id} (${ctx.label})` : ctx.id;
      lines.push(`- **${title}** · kind=\`${ctx.kind}\``);
      for (const [k, v] of Object.entries(ctx.pins)) {
        lines.push(`  - **${k}:** ${v}`);
      }
    }
  }
  lines.push("");
  lines.push(
    `- **Active:** ${active.length ? active.join(", ") : "*(none)*"}`,
  );
  return lines;
}

/**
 * Regenerate CURRENT.md with Metadata, Contexts, and Status sections.
 * `meta` supplies stable fields (name, title, planRel) merged over event pins.
 */
export function regenerateCurrent({ paths, meta, events }) {
  const last = events[events.length - 1] ?? null;
  const lastRun = lastOfKind(events, "run");
  const lastConverge = lastOfKind(events, "converge");
  const pins = latestPins(events);
  const contexts = latestContexts(events);
  const active = latestActive(events);

  const metadata = {
    ledger: meta.name,
    title: meta.title ?? meta.name,
    plan: meta.planRel,
    ...pins,
  };

  const lines = [
    `# ${metadata.title} — current snapshot`,
    "",
    "Read this file before acting on this ledger.",
    "Do not invent pins, status, or next steps that are absent here.",
    "",
    "## Metadata",
    "",
  ];

  for (const [k, v] of Object.entries(metadata)) {
    lines.push(`- **${k}:** ${v}`);
  }

  lines.push("", ...formatContextBlock(contexts, active));

  lines.push(
    "",
    "## Status",
    "",
    `- **Updated:** ${last?.at ?? "never"}`,
    `- **Events:** ${events.length}`,
    `- **Last kind:** ${last?.kind ?? "—"}`,
    `- **Last concern:** ${last?.concern ?? "—"}`,
    `- **Last summary:** ${last?.summary ?? "—"}`,
    `- **Next:** ${last?.next ?? "Edit plan.md, then record the first unit"}`,
    "",
    "## Last run",
    "",
  );

  if (lastRun?.run) {
    lines.push(`- **command:** ${lastRun.run.command ?? "—"}`);
    lines.push(`- **contractHash:** ${lastRun.run.contractHash ?? "—"}`);
    lines.push(
      `- **matchedPrevious:** ${String(lastRun.run.matchedPrevious ?? "—")}`,
    );
  } else {
    lines.push("- *(no run events yet)*");
  }

  lines.push("", "## Last convergence", "");
  lines.push(
    lastConverge
      ? `- ${lastConverge.at} — ${lastConverge.concern ?? "—"}: ${lastConverge.summary}`
      : "- *(none yet)*",
  );

  lines.push("", "## Recent history (newest last)", "");
  const recent = events.slice(-20);
  if (recent.length === 0) {
    lines.push("- *(none yet)*");
  } else {
    for (const e of recent) {
      lines.push(
        `- \`${e.id}\` · ${e.kind}${e.concern ? ` · ${e.concern}` : ""} — ${e.summary}`,
      );
    }
  }

  lines.push(
    "",
    "## Pointers",
    "",
    `- Plan: \`${meta.planRel}\``,
    `- Base prompt: \`.ledger/${meta.name}/base-prompt.md\``,
    `- Events: \`.ledger/${meta.name}/events/\``,
    `- Decisions: \`.ledger/${meta.name}/decisions/\``,
    `- Schema: (package) \`schema/progress-event.schema.json\``,
    "",
  );

  writeFileSync(paths.current, `${lines.join("\n")}\n`, "utf8");
}
