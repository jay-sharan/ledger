import {
  findProjectRoot,
  listLedgers,
  readLedgerYaml,
  requireLedger,
} from "../lib/paths.mjs";
import { nextUnit, readEvents } from "../lib/events.mjs";

export async function listCmd() {
  const projectRoot = findProjectRoot();
  const names = listLedgers(projectRoot);
  if (names.length === 0) {
    console.log("No ledgers yet. Run: ledger init <name>");
    return;
  }

  const rows = names.map((name) => {
    const paths = requireLedger(projectRoot, name);
    const cfg = readLedgerYaml(paths.yaml);
    const events = readEvents(paths.jsonl);
    const next = nextUnit(events);
    const current = next
      ? (events[events.length - 1]?.concern ?? "—")
      : "Done";
    return { name, title: cfg.title ?? name, current, next: next ?? "" };
  });

  const width = (header, key) =>
    Math.max(header.length, ...rows.map((r) => r[key].length));
  const nameWidth = width("NAME", "name");
  const currentWidth = width("CURRENT", "current");
  const nextWidth = width("NEXT", "next");

  console.log(
    `${"NAME".padEnd(nameWidth)}  ${"CURRENT".padEnd(currentWidth)}  ${"NEXT".padEnd(nextWidth)}  TITLE`,
  );
  for (const row of rows) {
    console.log(
      `${row.name.padEnd(nameWidth)}  ${row.current.padEnd(currentWidth)}  ${row.next.padEnd(nextWidth)}  ${row.title}`,
    );
  }
}
