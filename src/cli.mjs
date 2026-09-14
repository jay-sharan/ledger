import { assertCmd } from "./commands/assert.mjs";
import { checkpointCmd } from "./commands/checkpoint.mjs";
import { helpCmd } from "./commands/help.mjs";
import { initCmd } from "./commands/init.mjs";
import { listCmd } from "./commands/list.mjs";
import { promptCmd } from "./commands/prompt.mjs";
import { statusCmd } from "./commands/status.mjs";

const COMMANDS = {
  init: initCmd,
  list: listCmd,
  status: statusCmd,
  prompt: promptCmd,
  checkpoint: checkpointCmd,
  assert: assertCmd,
  help: helpCmd,
  "--help": helpCmd,
  "-h": helpCmd,
};

export async function main(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    helpCmd(rest);
    return;
  }
  const handler = COMMANDS[cmd];
  if (!handler) {
    console.error(`Unknown command: ${cmd}\n`);
    helpCmd([]);
    process.exit(1);
  }
  await handler(rest);
}
