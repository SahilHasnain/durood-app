Recommended Fixes (ordered by impact)
1. Add @react-native-community/netinfo — listen for online/offline transitions, auto-trigger syncPendingState() when connectivity is restored
2. Add AppState listener sync — on AppState.change to "active", flush the pending queue
3. Expose pending sync count in UI — show a small banner/indicator when PENDING_SYNC_KEY exists in AsyncStorage
4. Sync Dalail + ProgressTracking to Appwrite — those features have zero cloud backup
5. Consider a full operation log instead of single-slot queue (for multi-device scenarios)
Want me to implement any of these? The biggest bang-for-buck is #1 + #2 (network + app-foreground retry), which would cover ~90% of offline-sync failures with minimal code.