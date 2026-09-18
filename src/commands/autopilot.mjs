import {
  findProjectRoot,
  readLedgerYaml,
  requireLedger,
  setLedgerYamlValue,
} from "../lib/paths.mjs";
import { readEvents, regenerateCurrent } from "../lib/events.mjs";

function usage() {
  console.error(`Usage:
  ledger autopilot <name>
  ledger autopilot <name> on
  ledger autopilot <name> off`);
  process.exit(1);
}

function parseMode(raw) {
  if (raw === undefined) return null;
  const v = String(raw).toLowerCase();
  if (v === "on" || v === "true" || v === "1") return true;
  if (v === "off" || v === "false" || v === "0") return false;
  throw new Error(`Unknown autopilot mode "${raw}". Use on or off.`);
}

export async function autopilotCmd(argv) {
  const name = argv[0];
  if (!name || name.startsWith("-")) usage();

  let mode;
  try {
    mode = parseMode(argv[1]);
  } catch (err) {
    console.error(err.message);
    usage();
  }

  const projectRoot = findProjectRoot();
  const paths = requireLedger(projectRoot, name);
  const cfg = readLedgerYaml(paths.yaml);

  if (mode === null) {
    const on = cfg.autopilot === true;
    console.log(`autopilot: ${on ? "on" : "off"} (ledger=${name})`);
    return;
  }

  setLedgerYamlValue(paths.yaml, "autopilot", mode);
  const nextCfg = readLedgerYaml(paths.yaml);
  regenerateCurrent({
    paths,
    meta: {
      name,
      title: nextCfg.title ?? name,
      planRel: paths.planRel,
      autopilot: nextCfg.autopilot === true,
    },
    events: readEvents(paths.jsonl),
  });

  console.log(`autopilot: ${mode ? "on" : "off"} (ledger=${name})`);
  console.log(`Updated .ledger/${name}/ledger.yaml and CURRENT.md`);
}
