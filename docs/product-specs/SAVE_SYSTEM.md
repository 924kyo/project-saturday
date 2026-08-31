# Save System

## Principle

Save architecture is infrastructure from the beginning, not an export/import feature added later.

## Storage

Primary browser storage: IndexedDB via a thin typed adapter.

Recommended stores:

- profile/meta;
- current career;
- autosave snapshots;
- settings;
- migration metadata.

Optional emergency mirror may use localStorage for a small latest-save envelope, not as the primary database.

## Save envelope

Conceptually:

```ts
interface SaveEnvelope<T> {
  saveVersion: number;
  contentVersion: string;
  createdAt: string;
  updatedAt: string;
  checksum: string;
  payload: T;
}
```

Exact checksum implementation is an engineering detail; it detects accidental corruption, not security tampering.

## Autosave

Autosave after verified domain transitions such as:

- completed weekly action;
- resolved event choice;
- post-game completion;
- skill-card choice;
- week/season transition;
- major offseason decision.

Avoid saving partial multi-step transactions as if complete.

## Snapshots

Keep rolling historical snapshots sufficient to recover from corruption/regression. Exact retention is tuneable; start around 20–60 lightweight snapshots depending size.

## Persistence request

The PWA may request browser persistent storage when supported, without blocking gameplay if unavailable.

## Migrations

Every schema change requires:

- incremented save version when structurally relevant;
- migration function;
- migration tests using previous-version fixtures;
- no silent field reinterpretation.

## Cloud sync

Not required for the first vertical slice. Design the adapter boundary so future cloud sync can be added without moving game rules into networking code.
