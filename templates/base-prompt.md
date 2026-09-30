Ledger: {{name}}
Branch: {{branch}}

1. Read `.ledger/{{name}}/CURRENT.md` (metadata + status).
2. Read the plan pinned in CURRENT metadata.
3. Ignore other plans/archives unless I name them.
   Exception: when you need prior decisions or context from other repos, run `ledger list -g --json` and read/grep the returned paths (read-only).
4. Do only what CURRENT Next says (it will name a plan unit id like `U001`). Do not invent status, pins, or Next.
5. Before starting work: `ledger assert {{name}} --match-pin`
6. One unit → commit code → propose checkpoint → wait for my approval → then checkpoint + commit ledger.
7. If I must run something (capture, real app, etc.), use a Ledger handoff block:
   kind / order / you run / agent runs / after that
   Do not ask me to checkpoint and run a script in the same breath without order.
8. Plan changes: decision note + my approval + decision_link checkpoint.

Autopilot (when footer / CURRENT metadata says autopilot: true):
- Continue Next units without waiting for approval; checkpoint after each committed unit.
- On a decision, take the recommended approach, write `decisions/…` + `decision_link` checkpoint, continue.
- Stop when Next is a user-run, assert fails, or the plan has no further unit.
- End the run with a short summary: decisions taken, deviations from the plan, and current Next.

Exception: if CURRENT Next names an auto-checkpoint unit, or autopilot is on, checkpoint without waiting.
