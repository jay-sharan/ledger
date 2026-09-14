import {
  findProjectRoot,
  hasFlag,
  requireLedger,
} from "../lib/paths.mjs";
import { latestPins, readEvents } from "../lib/events.mjs";
import { git, tryGit } from "../lib/git.mjs";

function usage() {
  console.error("Usage: ledger assert <name> [--match-pin]");
  process.exit(1);
}

export async function assertCmd(argv) {
  const name = argv[0];
  if (!name || name.startsWith("-")) usage();

  const matchPin = hasFlag(argv, "--match-pin");
  const projectRoot = findProjectRoot();
  requireLedger(projectRoot, name);

  let head;
  try {
    head = git(projectRoot, ["rev-parse", "HEAD"]);
  } catch {
    console.error(
      "assert: no HEAD. Create the first commit before starting work.",
    );
    process.exit(1);
  }

  const porcelain = tryGit(projectRoot, ["status", "--porcelain"]);
  if (porcelain) {
    console.error(
      "assert: working tree is not clean. Commit the current unit before starting the next one.",
    );
    console.error(porcelain);
    process.exit(1);
  }

  if (matchPin) {
    const paths = requireLedger(projectRoot, name);
    const pins = latestPins(readEvents(paths.jsonl));
    const pin = typeof pins.commit === "string" ? pins.commit.trim() : "";
    if (!pin) {
      console.error("assert: --match-pin requires a ledger pins.commit value.");
      process.exit(1);
    }
    if (!head.startsWith(pin) && !pin.startsWith(head)) {
      try {
        git(projectRoot, ["merge-base", "--is-ancestor", pin, "HEAD"]);
      } catch {
        console.error(
          `assert: HEAD ${head} does not contain ledger commit pin ${pin}.`,
        );
        process.exit(1);
      }
    }
  }

  console.log(`assert: ok ledger=${name} HEAD=${head}`);
}
