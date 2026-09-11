# Tasbeeh Sync Function

This function applies an offline recitation event exactly once.

## Required environment variables

- `APPWRITE_FUNCTION_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_EVENTS_COLLECTION_ID`
- `APPWRITE_PROGRESS_COLLECTION_ID` (defaults to `tasbeeh_progress`)
- `APPWRITE_GOALS_COLLECTION_ID` (defaults to `tasbeeh_progress_goals`)

## Events collection

Create a collection with these required attributes:

- `eventId`: string, required
- `userId`: string, required
- `date`: string, required
- `amount`: integer, required
- `sessionId`: string, optional
- `createdAt`: datetime/string, required

Use `eventId` as the document ID and grant the Function API key permission to create documents and update the progress and goals collections.

The client should keep events in an AsyncStorage queue and remove each event only after this Function returns `accepted: true`.
