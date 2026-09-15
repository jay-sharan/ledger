# {{title}} — implementation plan

```
contract: ledger-implementation-plan/v1
ledger: {{name}}
```

Agents will treat this file as the only execution plan for ledger `{{name}}`.
Fill this file using the contract template at `templates/implementation-plan.md`
in the ledger package (or ask an agent to author via `templates/plan-author-prompt.md`).
Until units are filled, do not start implementation.

---

## Goal

TBD — author the plan before coding.

## Success

- TBD

## Out of scope

- TBD

## Pins sketch

### Home

| key | value |
| --- | --- |
| branch | {{branch}} |
| commit | TBD |
| plan | `.ledger/{{name}}/plan.md` |

### Contexts

| id | kind | label | pin keys (path, branch, commit, …) |
| --- | --- | --- | --- |

### Active

- none

## Phases

### P1 — TBD

**Outcome:** TBD

## Units

### U001 — TBD

| field | value |
| --- | --- |
| phase | P1 |
| why | TBD |
| runner | agent |
| commit | `chore({{name}}): TBD` |
| artifacts | none |

**Do**

1. TBD

**Done when**

- TBD

## First Next

```
U001 — TBD (replace after authoring the plan)
```

## Open questions

- What is the concrete goal of this ledger?

## Change control

Plan edits after execution starts will require a decision note, user approval,
and a `decision_link` checkpoint.
