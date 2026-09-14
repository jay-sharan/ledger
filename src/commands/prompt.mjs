import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  findProjectRoot,
  hasFlag,
  readLedgerYaml,
  requireLedger,
} from "../lib/paths.mjs";
import {
  latestActive,
  latestContexts,
  latestPins,
  readEvents,
} from "../lib/events.mjs";

function usage() {
  console.error("Usage: ledger prompt <name> [--no-copy]");
  process.exit(1);
}

function copyToClipboard(text) {
  if (process.platform === "darwin") {
    const r = spawnSync("pbcopy", [], { input: text, encoding: "utf8" });
    return r.status === 0;
  }
  if (process.platform === "linux") {
    const r = spawnSync("xclip", ["-selection", "clipboard"], {
      input: text,
      encoding: "utf8",
    });
    if (r.status === 0) return true;
    const r2 = spawnSync("wl-copy", [], { input: text, encoding: "utf8" });
    return r2.status === 0;
  }
  return false;
}

function formatActiveFooter(contexts, active) {
  if (!active.length) return "Active contexts: (none)";
  const byId = new Map(contexts.map((c) => [c.id, c]));
  const parts = active.map((id) => {
    const ctx = byId.get(id);
    if (!ctx) return id;
    return ctx.label ? `${id} (${ctx.label})` : id;
  });
  return `Active contexts: ${parts.join(", ")}`;
}

export async function promptCmd(argv) {
  const name = argv[0];
  if (!name || name.startsWith("-")) usage();

  const projectRoot = findProjectRoot();
  const paths = requireLedger(projectRoot, name);
  const cfg = readLedgerYaml(paths.yaml);
  const events = readEvents(paths.jsonl);
  const last = events[events.length - 1];
  const pins = latestPins(events);
  const contexts = latestContexts(events);
  const active = latestActive(events);
  const branch = pins.branch ?? "(see CURRENT metadata)";
  const next = last?.next ?? "(see CURRENT.md)";

  let body = readFileSync(paths.basePrompt, "utf8").trimEnd();
  body = body
    .replaceAll("{{name}}", name)
    .replaceAll("{{title}}", cfg.title ?? name)
    .replaceAll("{{branch}}", branch);

  const footer = `

---
CURRENT Next: ${next}
Plan: ${paths.planRel}
CURRENT: .ledger/${name}/CURRENT.md
${formatActiveFooter(contexts, active)}
autoCheckpoint: ${cfg.autoCheckpoint === true ? "true" : "false"}
`;

  const text = `${body}${footer}\n`;
  process.stdout.write(text);

  if (!hasFlag(argv, "--no-copy")) {
    if (copyToClipboard(text)) {
      console.error("\n(copied to clipboard)");
    } else {
      console.error("\n(clipboard copy unavailable; prompt printed above)");
    }
  }
}
