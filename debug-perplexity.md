# Debug Guide for Perplexity Service Issue

## Steps to Debug

### 1. Check Logs in Zotero
After installing the updated plugin:

1. **Open Zotero Debug Output**:
   - Help → Debug Output Logging → View Output
   - Make sure "Enable after restart" is checked
   - Restart Zotero

2. **Look for Plugin Initialization Logs**:
   Search for these log messages:
   ```
   [ZoteroCitationLinker] Initializing Perplexity service...
   [ZoteroCitationLinker] Fetching preference: extensions.zotero-citation-linker.perplexityApiKey
   [ZoteroCitationLinker] Retrieved API key: [SET - XX chars] or [NOT SET]
   ```

### 2. Test the analyzeurl Endpoint
Try your `analyzeurl` request and look for these specific log messages:

**When AI step starts:**
```
[ZoteroCitationLinker] Step 5: Attempting AI identifier extraction using Perplexity
[ZoteroCitationLinker] Starting AI identifier extraction for URL: [your-url]
```

**If service not initialized:**
```
[ZoteroCitationLinker] Perplexity service not initialized! Current state: initialized=false, apiKey=[SET] or [NOT SET]
```

### 3. Manual Check in Zotero Console
Open Zotero Console (Tools → Developer → Run JavaScript) and run:

```javascript
// Check if preference is set
Zotero.Prefs.get('extensions.zotero-citation-linker.perplexityApiKey')

// Check service status
Zotero.ZoteroCitationLinker.services.perplexityService.isInitialized()

// Force re-initialization
await Zotero.ZoteroCitationLinker.services.perplexityService.initialize()
```

### 4. Common Issues and Solutions

**Issue 1: API Key Not Found**
- **Symptom**: Log shows `Retrieved API key: [NOT SET]`
- **Solution**: Double-check the preference name and value in Config Editor

**Issue 2: API Key Invalid Format**
- **Symptom**: Log shows `API key format appears invalid`
- **Solution**: Ensure API key starts with `pplx-`

**Issue 3: Service Not Re-initializing**
- **Symptom**: Service shows as not initialized even after setting API key
- **Solution**: Run manual re-initialization command above

### 5. Enable Debug Logging
Set this preference for more verbose output:
- `extensions.zotero-citation-linker.debug` = `true`

## Expected Log Flow (Working Case)

When everything works correctly, you should see:

```
[ZoteroCitationLinker] Initializing Perplexity service...
[ZoteroCitationLinker] Retrieved API key: [SET - 45 chars]
[ZoteroCitationLinker] Perplexity service initialized successfully with API key
...
[ZoteroCitationLinker] Step 5: Attempting AI identifier extraction using Perplexity
[ZoteroCitationLinker] Starting AI identifier extraction for URL: https://example.com
[ZoteroCitationLinker] PerplexityService.isInitialized(): true (initialized: true, hasApiKey: true)
[ZoteroCitationLinker] Making Perplexity API request to: https://api.perplexity.ai/chat/completions
[ZoteroCitationLinker] Perplexity API response status: 200
```

## What's Changed in This Update

1. **Enhanced Logging**: Much more verbose output to identify exactly where the issue occurs
2. **Dynamic Re-initialization**: Service checks for API key changes on every `isInitialized()` call
3. **Better Error Messages**: More specific error information
4. **Preference Validation**: Checks API key format and provides guidance

Try the updated plugin and share the specific log messages you see!