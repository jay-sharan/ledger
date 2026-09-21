import {
  findProjectRoot,
  listLedgers,
  readLedgerYaml,
  requireLedger,
} from "../lib/paths.mjs";

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
    return { name, title: cfg.title ?? name };
  });

  const nameWidth = Math.max(
    "NAME".length,
    ...rows.map((r) => r.name.length),
  );

  console.log(`${"NAME".padEnd(nameWidth)}  TITLE`);
  for (const row of rows) {
    console.log(`${row.name.padEnd(nameWidth)}  ${row.title}`);
  }
}
