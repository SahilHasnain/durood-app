# Tasbeeh Offline Sync Plan

The frontend currently continues using the existing snapshot-based sync. Do not enable the event sync until the client integration work below is completed and tested.

## Current Backend Resources

- Function: `tasbeeh-sync`
- Function source: `functions/tasbeeh-sync/src/main.js`
- Events collection: `tasbeeh_sync_events`
- Database: `69d787ad002831c59b48`
- Progress collection: `tasbeeh_progress`
- Goals collection: `tasbeeh_progress_goals`

The Function deployment and collection were provisioned through the Appwrite API. Function variables are documented in `functions/tasbeeh-sync/.env.local` and must be configured in the Appwrite Console. Never commit the server API key.

## Why This Is Needed

The current client uploads absolute snapshots. If two devices start from different totals, the later upload can overwrite the earlier device's progress.

The future implementation must upload increments instead:

```json
{
  "eventId": "unique-event-id",
  "sessionId": "unique-session-id",
  "date": "2026-09-11",
  "amount": 100,
  "target": 3000
}
```

## Deferred Frontend Work

1. Add an `AsyncStorage` pending-event queue.
2. Create one stable event ID per uploaded batch.
3. Add each recitation or session increment to the queue before attempting network sync.
4. Call the Appwrite Function using the Appwrite Functions client.
5. Remove an event only after the Function returns `accepted: true`.
6. Retry pending events on app launch, reconnect, and account initialization.
7. Keep the existing local session checkpoint for refresh and crash recovery.
8. After the queue is empty, reload server totals and replace the local snapshot.
9. Do not call the current absolute `createOrUpdateDailyProgress` and `createOrUpdateUserGoal` path for queued increments.

## Function Configuration

Configure these variables under **Appwrite Console > Functions > tasbeeh-sync > Variables**:

- `APPWRITE_FUNCTION_PROJECT_ID`
- `APPWRITE_FUNCTION_API_ENDPOINT`
- `APPWRITE_API_KEY` as a secret variable
- `APPWRITE_DATABASE_ID`
- `APPWRITE_EVENTS_COLLECTION_ID`
- `APPWRITE_PROGRESS_COLLECTION_ID`
- `APPWRITE_GOALS_COLLECTION_ID`

The Function API key needs permission to create event documents and increment attributes in the progress and goals collections.

## Verification Checklist

- Recite offline, close the app, reconnect, and confirm the queue is retried.
- Recite from two browsers at the same time and confirm totals are additive.
- Retry the same event and confirm it is not counted twice.
- Refresh during an active session and confirm the local checkpoint is restored.
- Confirm failed events remain queued.
- Confirm the existing frontend remains unchanged until this checklist passes.
