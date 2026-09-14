import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  findProjectRoot,
  hasFlag,
  readLedgerYaml,
  requireLedger,
} from "../lib/paths.mjs";
import {
  appendEvent,
  jsonlHash,
  readEvents,
  regenerateCurrent,
} from "../lib/events.mjs";

function usage() {
  console.error(`Usage:
  ledger checkpoint <name> --file <event.json>
  ledger checkpoint <name> --stdin
  ledger checkpoint <name> --regen`);
  process.exit(1);
}

function readEvent(argv) {
  if (hasFlag(argv, "--regen")) return null;

  const fileIdx = argv.indexOf("--file");
  if (fileIdx !== -1) {
    const path = argv[fileIdx + 1];
    if (!path) usage();
    return JSON.parse(readFileSync(resolve(path), "utf8"));
  }

  if (hasFlag(argv, "--stdin")) {
    return JSON.parse(readFileSync(0, "utf8"));
  }

  usage();
}

export async function checkpointCmd(argv) {
  const name = argv[0];
  if (!name || name.startsWith("-")) usage();

  const projectRoot = findProjectRoot();
  const paths = requireLedger(projectRoot, name);
  const cfg = readLedgerYaml(paths.yaml);
  const event = readEvent(argv);

  if (event) {
    // Also write a copy under events/ if id is present and file wasn't already there path
    appendEvent(paths.jsonl, event);
    const eventFile = resolve(paths.events, `${event.id}.json`);
    try {
      writeFileSync(eventFile, `${JSON.stringify(event, null, 2)}\n`, "utf8");
    } catch {
      // non-fatal: jsonl is source of truth
    }
    console.log(`Appended ${event.id}`);
  }

  const events = readEvents(paths.jsonl);
  regenerateCurrent({
    paths,
    meta: {
      name,
      title: cfg.title ?? name,
      planRel: paths.planRel,
    },
    events,
  });

  const hash = jsonlHash(paths.jsonl);
  console.log(
    `Regenerated CURRENT.md (${events.length} events, jsonl:${hash})`,
  );
}
