# Project Structure

Unzip this documentation package so these files sit at the **root of the future git repository**.

```text
project-saturday/
├─ AGENTS.md
├─ ARCHITECTURE.md
├─ README.md
├─ START_CODEX.md
├─ PROJECT_STRUCTURE.md
│
├─ apps/
│  └─ web/
│     └─ AGENTS.md
│
├─ packages/
│  ├─ game-core/
│  │  └─ AGENTS.md
│  ├─ game-content/
│  │  └─ AGENTS.md
│  └─ testkit/
│     └─ AGENTS.md
│
└─ docs/
   ├─ INDEX.md
   ├─ 00-project/
   ├─ product-specs/
   ├─ engineering/
   ├─ execution/
   ├─ exec-plans/
   │  ├─ active/
   │  └─ completed/
   ├─ adr/
   └─ qa/
```

The source-code directories may initially contain only `AGENTS.md`. Codex creates the actual workspace files during M0.

## Recommended setup

1. Create an empty folder named `project-saturday`.
2. Extract the contents of the provided package so `AGENTS.md` is directly inside that folder, not one level deeper.
3. Initialize git if desired: `git init`.
4. Open that folder in Codex.
5. Paste the one-time startup prompt from `START_CODEX.md`.

If the zip extracts a wrapper directory named `project-saturday-codex-docs`, either rename that directory to your repository name or move its contents into your intended repository root.
