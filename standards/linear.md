# Linear

Work for this repo is tracked in Linear: workspace **modkeep**, team **main**
(`MN`), project **Fasberry** (`P-MN-1`). This file is the label/priority
convention and the short recipe for agents. `AGENTS.md` links here.

## Where things live

| Entity | Value | ID |
|---|---|---|
| Workspace | modkeep | `b9fec801-6f1d-4e39-84d3-d8ab0d6378b7` |
| Team | main (`MN`) | `f4b55ccf-8c00-41a9-a55e-d8231e51c676` |
| Project | Fasberry (`P-MN-1`) | `8aa86643-28ec-4edd-bc45-066b269101b5` |

## Labels

Every issue created by an agent gets `AI`. On top of that, API and service work
gets `api` plus the service label, so a filter like `api + thunderbird` shows
exactly the backend surface.

| Label | ID | Use for |
|---|---|---|
| `AI` | `7a671200-4b24-4682-9eaf-c21f2d8619b3` | every agent-created issue |
| `api` | `c83659bd-200d-482b-89d0-828a59769c80` | public API: routes, auth, payments, integrations |
| `thunderbird` | `44e038e2-f8ac-41c9-be9c-726fc6f6de0d` | anything inside `apps/thunderbird` |
| `Infra` | `8bd80203-ee68-4e79-8658-7ea85692b553` | hosts, docker, networks, backups, deploy |
| `config` | `4c61f3e6-5c86-4e85-bfd6-f534f86adc2e` | plugin/server configuration |
| `bisquite` | `3416a741-adc7-4e66-a9de-923c2ae8d85c` | the Bisquite Minecraft server |
| `Bug` / `Feature` / `Improvement` | `a1b02f33-…` / `4d89a6fe-…` / `1f96a8df-…` | kind of work, optional |

Create or rename a label with `save_issue_label`; attach it with `addLabels`
(see below). Labels are team-scoped, so pass `team: 'main'`.

## Priority mapping

| Our severity | Linear `priority` | Name |
|---|---|---|
| P0 | `1` | Urgent |
| P1 | `2` | High |
| P2 | `3` | Medium |
| P3 | `4` | Low |

`0` is "No priority", never use it for a real finding.

## Creating a batch

```js
await tools.linear.save_issue({
  team: 'main',
  project: 'P-MN-1',
  title,
  description,          // markdown, real newlines
  priority: 2,          // P1
  state: 'Backlog',
  addLabels: ['AI', 'api', 'thunderbird'],
});
```

Check for duplicates first: `list_issues({ project: 'P-MN-1', limit: 100 })`
returns `{ issues: [...] }`. `save_issue` returns little, so verify created
issues with a second `list_issues` call.

## Issue shape

An audit finding is one issue and answers:

- **Где** - file and function, exact paths.
- **Почему важно** - impact in production, not restating the code.
- **Что сделать** - a concrete fix someone can start from.

Keep the description short (5-8 lines). Routes, schemas and process details
belong in the description; long analysis goes to a linked Linear document.

## Gotchas

- Create needs both `team` and `project`; update takes only `id`.
- `labels` replaces the whole set and silently drops `AI`; prefer `addLabels`.
- The Linear API answers 403 "not available in your region" from Russia; the
  Windows host needs the VPN egress, do not retry in a loop.
- Inside `execute`, backticks break the template literal - write descriptions
  without inline code ticks or build them with single quotes.
- Issue identifiers are `MN-<n>`; `P-MN-1` is the project, not an issue.
