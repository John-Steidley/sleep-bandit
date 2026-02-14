# Event-Sourced State Architecture

## Motivation

All user actions should be collected in a timestamped log. This enables future analysis features based on the timing of app usage and real-world behavior. Data should never be lost or deleted, only recontextualized by later actions.

### Example future analyses the event log enables

- Does bedtime (MARK_ASLEEP timestamp) correlate with sleep score?
- Do users who complete more checklist items sleep better?
- What time of evening do users typically perform their interventions?
- Does the gap between MARK_ASLEEP and RECORD_SCORE (proxy for sleep duration) predict score?
- Are there patterns in which interventions users skip after they were rolled?
- Does consistency of routine timing (low variance in event timestamps) correlate with better sleep?

## Architecture

### Event sourcing as source of truth

The app moves from snapshot-based persistence to event sourcing. The event log is the authoritative data store. The current `AppState` becomes derived state, materialized by replaying the event log. The materialized snapshot may be cached for performance but is never the source of truth.

**Storage**: The event log is stored in localStorage as a JSON array. Storage limits (~5-10MB) are not addressed now; this is a problem for later.

**Replay**: Events are replayed sequentially to produce the current `AppState`. The replay function is **strict**: unknown event types or malformed events cause an error. This forces explicit handling of schema changes.

### Log versioning

The event log carries a global version number. When the app loads a log with an older version, it runs a migration pass over the entire log before replay. This handles schema evolution (e.g., adding required fields to existing event types). The migration transforms old events into the current schema.

```typescript
interface EventLog {
  version: number;
  events: AppEvent[];
}
```

### Migration from existing data

**Clean break**: Existing localStorage snapshot data is converted into a synthetic `INIT` event that seeds the log. The `INIT` event carries the full current state as its payload. All subsequent actions produce new events. No destructive event types (like REMOVE_INTERVENTION) ever appear in the log.

### No deletion, anywhere

- `REMOVE_INTERVENTION` is removed entirely. Users can rename or disable interventions. Archival is a future feature.
- `CLEAR_DATA` is removed entirely. There is no way to wipe data from within the app.
- Data is only recontextualized, never destroyed.

## Derived state reshape

The materialized `AppState` produced by replay gets a reshaped data model.

### Observations: sparse index sets

Observations currently store `interventions: boolean[]` aligned to the interventions array. This changes to a **sparse active-index set**:

```typescript
// Before
interface Observation {
  date: string;
  interventions: boolean[];  // [true, false, true, false]
  score: number;
  notes?: Notes;
}

// After
interface Observation {
  nightDate: string;    // from ROLL_TONIGHT timestamp — which night this was for
  sleepDate: string;    // from MARK_ASLEEP timestamp — when the user went to sleep
  recordDate: string;   // from RECORD_SCORE timestamp — when the score was reported
  activeInterventions: number[];  // [0, 2] — indices of active interventions
  score: number;
  notes?: Notes;
}
```

Three timestamps are derived from the event sequence for each night:
- **nightDate**: when ROLL_TONIGHT was dispatched (which night this observation represents)
- **sleepDate**: when MARK_ASLEEP was dispatched (proxy for bedtime)
- **recordDate**: when RECORD_SCORE was dispatched (proxy for wake time)

### PendingNight: unchanged

`PendingNight` keeps its current dense representation (`interventions: boolean[]`, `samples: number[]`). It is transient data that gets converted to an observation on score recording.

### Bayesian inference boundary

`bayesian.ts` (computePosterior, etc.) continues to expect dense boolean rows. The conversion from sparse index sets to dense arrays happens in `usePosterior` at the inference boundary. `bayesian.ts` is unchanged.

## Event catalog

Every event carries a `type` string and a `timestamp` (ISO-8601). Below is the complete set of event types and their payloads.

### Lifecycle events

#### INIT
Synthetic event created during migration from snapshot-based storage. Seeds the log with the full prior state.

```typescript
{
  type: "INIT";
  timestamp: string;
  payload: {
    interventions: Intervention[];
    observations: Observation[];   // already in new sparse format after migration
    pendingNight: PendingNight | null;
    groups: Group[];
    config: StatisticalConfig;
    noteTagDefinitions: NoteTagDefinition[];
    checklistItems: ChecklistItemDefinition[];
  };
}
```

### Intervention events

#### ADD_INTERVENTION
User adds a new intervention.

```typescript
{
  type: "ADD_INTERVENTION";
  timestamp: string;
  payload: {
    name: string;
  };
}
```

#### RENAME_INTERVENTION
User renames an existing intervention.

```typescript
{
  type: "RENAME_INTERVENTION";
  timestamp: string;
  payload: {
    index: number;
    newName: string;
  };
}
```

#### TOGGLE_INTERVENTION_DISABLED
User enables or disables an intervention for Thompson Sampling.

```typescript
{
  type: "TOGGLE_INTERVENTION_DISABLED";
  timestamp: string;
  payload: {
    index: number;
  };
}
```

### Nightly flow events

#### ROLL_TONIGHT
Thompson Sampling selects tonight's interventions.

```typescript
{
  type: "ROLL_TONIGHT";
  timestamp: string;
  payload: {
    interventions: boolean[];  // dense: which interventions are active
    samples: number[];         // Thompson samples per intervention
  };
}
```

#### TOGGLE_PENDING_INTERVENTION
User checks or unchecks an intervention during the pending night flow. Each toggle (check or uncheck) is a separate event with its own timestamp.

```typescript
{
  type: "TOGGLE_PENDING_INTERVENTION";
  timestamp: string;
  payload: {
    index: number;
    active: boolean;  // true = checked, false = unchecked
  };
}
```

#### CHECK_CHECKLIST_ITEM
User checks or unchecks an evening checklist item. Each toggle is its own event. These events are logged but do not affect derived state now; they will power future analysis features.

```typescript
{
  type: "CHECK_CHECKLIST_ITEM";
  timestamp: string;
  payload: {
    index: number;
    label: string;     // denormalized for analysis convenience
    checked: boolean;
  };
}
```

#### MARK_ASLEEP
User indicates they are going to sleep.

```typescript
{
  type: "MARK_ASLEEP";
  timestamp: string;
  payload: {};
}
```

#### TOGGLE_NOTE_TAG
User checks or unchecks a note tag during the morning flow. Each toggle is its own event.

```typescript
{
  type: "TOGGLE_NOTE_TAG";
  timestamp: string;
  payload: {
    label: string;
    checked: boolean;
  };
}
```

#### RECORD_SCORE
User records their sleep score. This finalizes the night and produces an observation in derived state.

```typescript
{
  type: "RECORD_SCORE";
  timestamp: string;
  payload: {
    score: number;
    notes: Notes;      // final note tags state + free text
  };
}
```

#### CANCEL_PENDING
User discards the current pending night without recording.

```typescript
{
  type: "CANCEL_PENDING";
  timestamp: string;
  payload: {};
}
```

### Group events

#### ADD_GROUP
User creates a mutually exclusive intervention group.

```typescript
{
  type: "ADD_GROUP";
  timestamp: string;
  payload: {
    name: string;
    interventionIndices: number[];
  };
}
```

#### REMOVE_GROUP
User removes a group (interventions themselves are unaffected).

```typescript
{
  type: "REMOVE_GROUP";
  timestamp: string;
  payload: {
    index: number;
  };
}
```

#### UPDATE_GROUP
User modifies a group's name or members.

```typescript
{
  type: "UPDATE_GROUP";
  timestamp: string;
  payload: {
    index: number;
    name: string;
    interventionIndices: number[];
  };
}
```

### Configuration events

#### UPDATE_CONFIG
User changes statistical model parameters.

```typescript
{
  type: "UPDATE_CONFIG";
  timestamp: string;
  payload: {
    config: Partial<StatisticalConfig>;
  };
}
```

### Note & checklist definition events

#### ADD_NOTE_TAG
User adds a new note tag definition.

```typescript
{
  type: "ADD_NOTE_TAG";
  timestamp: string;
  payload: {
    label: string;
    description: string;
  };
}
```

#### UPDATE_NOTE_TAG
User modifies a note tag definition.

```typescript
{
  type: "UPDATE_NOTE_TAG";
  timestamp: string;
  payload: {
    index: number;
    label: string;
    description: string;
  };
}
```

#### ADD_CHECKLIST_ITEM
User adds a new evening checklist item definition.

```typescript
{
  type: "ADD_CHECKLIST_ITEM";
  timestamp: string;
  payload: {
    label: string;
    description: string;
  };
}
```

#### UPDATE_CHECKLIST_ITEM
User modifies a checklist item definition.

```typescript
{
  type: "UPDATE_CHECKLIST_ITEM";
  timestamp: string;
  payload: {
    index: number;
    label: string;
    description: string;
  };
}
```

#### REMOVE_CHECKLIST_ITEM
User removes a checklist item definition.

```typescript
{
  type: "REMOVE_CHECKLIST_ITEM";
  timestamp: string;
  payload: {
    index: number;
  };
}
```

### Data import events

#### IMPORT_DATA
Full backup import. The imported state becomes the new baseline. This event is appended to the existing log (history before the import is preserved).

```typescript
{
  type: "IMPORT_DATA";
  timestamp: string;
  payload: {
    interventions: Intervention[];
    observations: Observation[];
    pendingNight: PendingNight | null;
    groups: Group[];
    config: StatisticalConfig;
    noteTagDefinitions: NoteTagDefinition[];
    checklistItems: ChecklistItemDefinition[];
  };
}
```

#### IMPORT_HISTORICAL
Merge of historical data into existing state.

```typescript
{
  type: "IMPORT_HISTORICAL";
  timestamp: string;
  payload: {
    interventions: string[];              // names of interventions in the import
    nights: {
      interventions: boolean[];           // aligned to payload.interventions
      score: number;
      date?: string;
    }[];
  };
}
```

## Export format

The export/backup format is the raw event log (the `EventLog` object including version and events array). Importing an export replays it as an `IMPORT_DATA` event. This preserves the full history including all timestamps.

## Replay semantics

Given an event log, the replay function processes events sequentially to produce the current `AppState`:

1. Start with empty state (no interventions, no observations, no groups, default config)
2. For each event, apply the corresponding state transition
3. The nightly flow events (ROLL_TONIGHT through RECORD_SCORE / CANCEL_PENDING) accumulate into a pending night, which resolves into an observation on RECORD_SCORE
4. TOGGLE_PENDING_INTERVENTION and CHECK_CHECKLIST_ITEM events during a pending night update transient pending state. CHECK_CHECKLIST_ITEM does not affect the materialized observation.
5. TOGGLE_NOTE_TAG events update the notes for the pending night flow, reflected in the final RECORD_SCORE observation.
6. IMPORT_DATA replaces derived state entirely (as if replaying from a new INIT)
7. IMPORT_HISTORICAL merges imported data into current state (same logic as current reducer)

If replay encounters an unknown event type or a malformed event, it throws an error. The app should surface this to the user and suggest re-importing or contacting support.
