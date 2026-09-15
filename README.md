# ledger

A small CLI that keeps durable progress for big features you build with (or without) an AI assistant.

## Why

Long projects lose the thread: chat forgets, plans drift, and “what’s next?” becomes guesswork. Ledger gives you a file-backed snapshot of status, pins, and the next unit so work can resume from the same place every time.

## What it is

A personal progress tool. In a git project you can keep several ledgers (one per feature). Each ledger holds:

- a plan (`plan.md`)
- an append-only event log (`progress.jsonl`)
- a regenerated snapshot (`CURRENT.md`) with metadata, contexts, and **Next**
- optional decisions and a short base prompt for new chats

`ledger init` also seeds shared starters under `.ledger/templates/` once per project (plan-author prompt, implementation-plan contract, and related files).

Home `pins` (plan / branch / commit) belong to the ledger-host repo. Named `contexts` track other apps or packages; `active` lists which contexts matter for the current Next.

## How it works

1. Install the CLI, then run `ledger init <feat>` inside a project.
2. Author `.ledger/<feat>/plan.md` (use `.ledger/templates/` as a guide).
3. Paste `ledger prompt <feat>` into a new chat when you start or resume.
4. Do the unit named by **Next** in `CURRENT.md`.
5. Commit the code, then record progress with `ledger checkpoint`.
6. Use `ledger assert <feat> --match-pin` before the next unit so the tree is clean and matches the home commit pin.

```bash
npm install -g @j1514/ledger
ledger init my-feature --title "My feature" --branch feat/my-feature
ledger prompt my-feature
```

## Commands


| Command                                        | What it does                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `ledger init <name> [--title T] [--branch B]`  | Create `.ledger/<name>/` and seed `.ledger/templates/` once             |
| `ledger list`                                  | List ledgers in this project                                            |
| `ledger status [name]`                         | Show Next, home pins, contexts, and active                              |
| `ledger prompt <name> [--no-copy]`             | Print the base prompt (copies to clipboard when possible)               |
| `ledger checkpoint <name> --file <event.json>` | Append a progress event and regenerate CURRENT                          |
| `ledger checkpoint <name> --stdin`             | Checkpoint from stdin                                                   |
| `ledger checkpoint <name> --regen`             | Regenerate CURRENT from the existing log                                |
| `ledger assert <name> [--match-pin]`           | Require a clean tree; with `--match-pin`, also match home `pins.commit` |
| `ledger help`                                  | Show help                                                               |




## License

MIT