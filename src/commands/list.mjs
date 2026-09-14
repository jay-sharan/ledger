import {
  findProjectRoot,
  listLedgers,
  readLedgerYaml,
  requireLedger,
} from "../lib/paths.mjs";
import { readEvents } from "../lib/events.mjs";

export async function listCmd() {
  const projectRoot = findProjectRoot();
  const names = listLedgers(projectRoot);
  if (names.length === 0) {
    console.log("No ledgers yet. Run: ledger init <name>");
    return;
  }
  for (const name of names) {
    const paths = requireLedger(projectRoot, name);
    const cfg = readLedgerYaml(paths.yaml);
    const events = readEvents(paths.jsonl);
    const last = events[events.length - 1];
    const next = last?.next ?? "—";
    console.log(
      `${name}\t${cfg.title ?? name}\tevents=${events.length}\tnext=${next}`,
    );
  }
}
