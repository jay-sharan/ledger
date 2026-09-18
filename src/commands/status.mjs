import {
  findProjectRoot,
  listLedgers,
  readLedgerYaml,
  requireLedger,
} from "../lib/paths.mjs";
import {
  latestActive,
  latestContexts,
  latestPins,
  readEvents,
} from "../lib/events.mjs";

function printStatus(projectRoot, name) {
  const paths = requireLedger(projectRoot, name);
  const cfg = readLedgerYaml(paths.yaml);
  const events = readEvents(paths.jsonl);
  const last = events[events.length - 1];
  const pins = latestPins(events);
  const contexts = latestContexts(events);
  const active = latestActive(events);

  console.log(`ledger:  ${name}`);
  console.log(`title:   ${cfg.title ?? name}`);
  console.log(`plan:    ${paths.planRel}`);
  console.log(`autopilot: ${cfg.autopilot === true ? "on" : "off"}`);
  console.log(`events:  ${events.length}`);
  console.log(`updated: ${last?.at ?? "never"}`);
  console.log(`kind:    ${last?.kind ?? "—"}`);
  console.log(`next:    ${last?.next ?? "—"}`);
  if (Object.keys(pins).length) {
    console.log("pins (home):");
    for (const [k, v] of Object.entries(pins)) {
      console.log(`  ${k}: ${v}`);
    }
  }
  console.log(
    `active:  ${active.length ? active.join(", ") : "(none)"}`,
  );
  if (contexts.length) {
    console.log("contexts:");
    for (const ctx of contexts) {
      const label = ctx.label ? ` (${ctx.label})` : "";
      console.log(`  ${ctx.id}${label} · kind=${ctx.kind}`);
      for (const [k, v] of Object.entries(ctx.pins)) {
        console.log(`    ${k}: ${v}`);
      }
    }
  }
}

export async function statusCmd(argv) {
  const projectRoot = findProjectRoot();
  const name = argv[0];

  if (name && !name.startsWith("-")) {
    printStatus(projectRoot, name);
    return;
  }

  const names = listLedgers(projectRoot);
  if (names.length === 0) {
    console.log("No ledgers yet. Run: ledger init <name>");
    return;
  }
  if (names.length === 1) {
    printStatus(projectRoot, names[0]);
    return;
  }
  console.log("Multiple ledgers — pass a name, or use: ledger list\n");
  for (const n of names) {
    const paths = requireLedger(projectRoot, n);
    const events = readEvents(paths.jsonl);
    const last = events[events.length - 1];
    console.log(`${n}: ${last?.next ?? "—"}`);
  }
}
