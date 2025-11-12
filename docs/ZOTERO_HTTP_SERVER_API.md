# Zotero Internal HTTP Server API Documentation

## Overview

Zotero includes a built-in HTTP server that provides two main API surfaces:

1. **Connector API** - For browser extensions and external tools to save items to Zotero
2. **Local API** - A local implementation of the Zotero Web API (api.zotero.org)

The server runs on `localhost:23119` by default (configurable via `httpServer.port` preference).

## Table of Contents

- [Server Architecture](#server-architecture)
- [Connector API](#connector-api)
- [Local API](#local-api)
- [Integration Endpoints](#integration-endpoints)
- [Security Model](#security-model)
- [Response Codes](#response-codes)

---

## Server Architecture

### Core Components

#### 1. Server Core (`server.js`)

- Uses Firefox's `HttpServer` from `chrome://remote/content/server/httpd.sys.mjs`
- Listens on `127.0.0.1` (localhost only)
- Registers prefix handler for all requests at `/`
- Automatically closes on Zotero shutdown

#### 2. Request Handler

- Parses HTTP requests (GET, POST, HEAD, OPTIONS)
- Supports multiple content types:
  - `application/json`
  - `application/x-www-form-urlencoded`
  - `multipart/form-data`
  - `text/plain`
- Case-insensitive header handling via `Zotero.Server.Headers` proxy class
- Path parameter routing for dynamic endpoints (e.g., `/api/users/:userID/items`)

#### 3. Endpoint Registration

All endpoints are registered in `Zotero.Server.Endpoints` object with path keys:

```javascript
Zotero.Server.Endpoints["/connector/ping"] = EndpointClass;
```

### Endpoint Implementation Patterns

Endpoints can use three different signatures:

**1. Single-parameter (modern, recommended):**

```javascript
init: async function(requestData) {
    // requestData contains: method, pathname, pathParams, searchParams, headers, data
    return [statusCode, contentType, body];
    // or
    return { data: dataObject };
}
```

**2. Two-parameter (callback-based):**

```javascript
init: function(data, sendResponseCallback) {
    sendResponseCallback(statusCode, contentType, body);
}
```

**3. Three-parameter (with URL parsing):**

```javascript
init: function(url, data, sendResponseCallback) {
    // url contains: pathname, searchParams, userAgent
}
```

---

## Connector API

The Connector API enables browser extensions and external tools to interact with Zotero.

### API Version

Current: **CONNECTOR_API_VERSION = 3**

### Base Path

`/connector/`

### Authentication & Security

- No authentication required (localhost only)
- CORS protection: Rejects browser requests without proper headers
- Requires `X-Zotero-Connector-API-Version` header or `Zotero-Allowed-Request` header
- Bookmarklet origin (`https://www.zotero.org`) has special CORS allowances

### Common Response Headers

```bash
X-Zotero-Version: <Zotero version>
X-Zotero-Connector-API-Version: 3
```

---

### Connector Endpoints

#### 1. Test Connection

**`POST /connector/ping`**

Test if Zotero is running and get configuration.

**Request Body (JSON):**

```json
{
  "activeURL": "https://example.com/article"
}
```

**Response (200):**

```json
{
  "prefs": {
    "automaticSnapshots": true,
    "downloadAssociatedFiles": true,
    "supportsAttachmentUpload": true,
    "supportsTagsAutocomplete": true,
    "googleDocsAddNoteEnabled": true,
    "canUserAddNote": true,
    "googleDocsCitationExplorerEnabled": false,
    "translatorsHash": "<hash>",
    "sortedTranslatorHash": "<hash>",
    "reportActiveURL": true
  }
}
```

**GET Variant:**
Returns HTML: `<!DOCTYPE html><html><body>Zotero is running</body></html>`

---

#### 2. Get Translators

**`POST /connector/getTranslators`**

Get available translators for a URL or all translators.

**Request Body (JSON):**

```json
{
  "url": "https://example.com/article"
}
```

**Response (200):**

```json
[
  {
    "translatorID": "uuid",
    "translatorType": 4,
    "label": "Example Translator",
    "creator": "Author Name",
    "target": "^https://example\\.com",
    "priority": 100,
    "browserSupport": "gcsibv",
    "lastUpdated": "2023-01-15 12:00:00"
  }
]
```

---

#### 3. Detect Translators

**`POST /connector/detect`**

Detect which translators can handle a given page's HTML.

**Request Body (JSON):**

```json
{
  "uri": "https://example.com/article",
  "html": "<html>...</html>",
  "cookie": "session=abc123"
}
```

**Response (200):**
Array of matching translators with their metadata.

---

#### 4. Save Items

**`POST /connector/saveItems`**

Save one or more items to Zotero with metadata from a translator.

**Request Body (JSON):**

```json
{
  "sessionID": "optional-session-id",
  "uri": "https://example.com/article",
  "items": [
    {
      "id": "item-1",
      "itemType": "journalArticle",
      "title": "Article Title",
      "creators": [
        {
          "firstName": "John",
          "lastName": "Doe",
          "creatorType": "author"
        }
      ],
      "date": "2023",
      "publicationTitle": "Journal Name"
    }
  ],
  "cookie": "session=abc123",
  "detailedCookies": "optional",
  "proxy": {
    "scheme": "%h.example.com"
  }
}
```

**Response:**

- `201`: Items saved successfully
- `409`: Session already exists
- `500`: Error with `{ "libraryEditable": false }` if library is read-only

**Notes:**

- Creates a session for tracking attachments and updates
- Saves items to currently selected library/collection
- Supports proxy configuration for deproxifying URLs

---

#### 5. Save Snapshot

**`POST /connector/saveSnapshot`**

Save a webpage as a snapshot (used when no translator is available).

**Request Body (JSON):**

```json
{
  "sessionID": "required-session-id",
  "url": "https://example.com/article",
  "title": "Page Title"
}
```

**Response:**

- `201`: Snapshot item created
- `409`: Session already exists
- `500`: Library not editable

**Notes:**

- Creates a "webpage" item type
- Snapshot HTML/SingleFile attachment comes via `/connector/saveSingleFile`

---

#### 6. Save SingleFile Attachment

**`POST /connector/saveSingleFile`**

Save a SingleFile snapshot to an existing item.

**Request Body (JSON or multipart/form-data):**

```json
{
  "sessionID": "required",
  "snapshotContent": "<html>...</html>",
  "url": "https://example.com/article",
  "title": "Page Title",
  "cookie": "optional",
  "detailedCookies": "optional",
  "proxy": null
}
```

**Response:**

- `201`: Attachment saved
- `400`: Session not found
- `200`: Library files not editable (text/plain)

---

#### 7. Save Standalone Attachment

**`POST /connector/saveStandaloneAttachment?sessionID=xyz`**

Save a PDF/EPUB as a standalone item (no parent).

**Headers:**

```none
Content-Type: application/pdf
Content-Length: <bytes>
X-Metadata: {
  "sessionID": "required",
  "title": "Document Title",
  "url": "https://example.com/file.pdf"
}
```

**Body:** Binary file stream

**Response (201):**

```json
{
  "canRecognize": true
}
```

**Notes:**

- Automatically triggers PDF/EPUB metadata recognition if possible
- Use `/connector/getRecognizedItem` to check recognition results

---

#### 8. Save Child Attachment

**`POST /connector/saveAttachment?sessionID=xyz`**

Attach a PDF/EPUB to an item saved via `/connector/saveItems`.

**Headers:**

```none
Content-Type: application/pdf
Content-Length: <bytes>
X-Metadata: {
  "sessionID": "required",
  "parentItemID": "connector-item-id",
  "title": "Document Title",
  "url": "https://example.com/file.pdf"
}
```

**Body:** Binary file stream

**Response:**

- `201`: Attachment saved
- `400`: Session/parent not found

---

#### 9. Get Recognized Item

**`POST /connector/getRecognizedItem`**

Check if a standalone attachment has been recognized and converted to proper metadata.

**Request Body (JSON):**

```json
{
  "sessionID": "required"
}
```

**Response (200):**

```json
{
  "title": "Recognized Title",
  "itemType": "journalArticle"
}
```

**Response (204):**
No recognized item available yet.

---

#### 10. Check Attachment Resolvers

**`POST /connector/hasAttachmentResolvers`**

Check if OA PDFs or custom resolvers are available for an item.

**Request Body (JSON):**

```json
{
  "sessionID": "required",
  "itemID": "connector-item-id"
}
```

**Response (200):**

```json
true
```

---

#### 11. Save Attachment from Resolver

**`POST /connector/saveAttachmentFromResolver`**

Save an attachment using OA resolvers or custom resolvers.

**Request Body (JSON):**

```json
{
  "sessionID": "required",
  "itemID": "connector-item-id"
}
```

**Response:**

- `201`: Returns attachment title (text/plain)
- `500`: Failed to save attachment

---

#### 12. Update Session

**`POST /connector/updateSession`**

Update the target collection, tags, or note for a save session.

**Request Body (JSON):**

```json
{
  "sessionID": "required",
  "target": "C123",
  "tags": ["tag1", "tag2"],
  "note": "Optional note text"
}
```

**Target Format:**

- `L1` - Library ID 1
- `C123` - Collection ID 123

**Response (200):**

```json
{}
```

**Notes:**

- Moves already-saved items to new collection
- Applies tags to all items in session
- Adds/updates note as child item

---

#### 13. Get Selected Collection

**`POST /connector/getSelectedCollection`**

Get the current save target and available collections.

**Request Body (JSON):**

```json
{
  "switchToReadableLibrary": false
}
```

**Response (200):**

```json
{
  "libraryID": 1,
  "libraryName": "My Library",
  "libraryEditable": true,
  "filesEditable": true,
  "editable": true,
  "id": 123,
  "name": "Collection Name",
  "targets": [
    {
      "id": "L1",
      "name": "My Library",
      "filesEditable": true,
      "level": 0,
      "recent": true
    },
    {
      "id": "C123",
      "name": "Subcollection",
      "filesEditable": true,
      "level": 1
    }
  ],
  "tags": {
    "L1": ["tag1", "tag2"],
    "C123": ["tag3"]
  }
}
```

---

#### 14. Get Translator Code

**`POST /connector/getTranslatorCode`**

Get the JavaScript code for a specific translator.

**Request Body (JSON):**

```json
{
  "translatorID": "uuid"
}
```

**Response (200):**

```javascript
// Translator code (application/javascript)
```

---

#### 15. Import Data

**`POST /connector/import?session=optional-id`**

Import data using import translators (e.g., BibTeX, RIS).

**Headers:**

```none
Content-Type: application/x-bibtex (or other format)
```

**Body:** Data to import

**Response (201):**

```json
[
  {
    "key": "ABCD1234",
    "version": 0,
    "itemType": "journalArticle"
  }
]
```

---

#### 16. Install Style

**`POST /connector/installStyle?origin=url`**

Install a CSL citation style.

**Body:** CSL XML content

**Response (201):**

```json
{
  "name": "Style Name"
}
```

**Response (400):**
Error message (text/plain)

---

#### 17. Get Client Hostnames

**`POST /connector/getClientHostnames`**

Get reverse DNS lookups for local IP addresses (for proxy detection).

**Response (200):**

```json
["hostname1.example.com", "hostname2.example.com"]
```

---

#### 18. Get Proxies

**`POST /connector/proxies`**

Get configured proxy servers.

**Response (200):**

```json
[
  {
    "id": 1,
    "scheme": "%h.proxy.example.com",
    "hosts": ["example.com", "example.org"]
  }
]
```

---

#### 19. Delay Sync

**`POST /connector/delaySync`**

Delay automatic sync for 10 seconds.

**Response:** 204 No Content

---

#### 20. HTTP Request Proxy

**`POST /connector/request`**

Make an HTTP request from Zotero (for translator needs).

**Request Body (JSON):**

```json
{
  "method": "GET",
  "url": "https://www.worldcat.org/...",
  "options": {
    "headers": {
      "Accept": "application/json"
    }
  }
}
```

**Allowed Hosts:**

- `www.worldcat.org`

**Response (200):**

```json
{
  "status": 200,
  "headers": {
    "Content-Type": "text/html"
  },
  "body": "response body as string"
}
```

**Notes:**

- Restricted to hardcoded list of allowed hosts for security
- Always returns 200; check `status` field for actual HTTP status

---

### Session Management

Sessions track multi-step save operations and allow updates after initial save.

**Session Lifecycle:**

1. Created by `/connector/saveItems`, `/connector/saveSnapshot`, or `/connector/saveStandaloneAttachment`
2. Updated via `/connector/updateSession` to change collection/tags
3. Attachments added via `/connector/saveAttachment` or `/connector/saveSingleFile`
4. Auto-deleted after 10 minutes (or 1 minute if >10 sessions exist)

**Session ID Format:** Random string or client-provided

**Session Actions:**

- `saveItems` - Translator-based save with multiple items
- `saveSnapshot` - Simple webpage snapshot
- `saveStandaloneAttachment` - Single file item

---

## Local API

A local implementation of the Zotero Web API for direct access to local data.

### Base Path

`/api/`

### API Version

Current: **LOCAL_API_VERSION = 3**

### Configuration

Enable via preference: `httpServer.localAPI.enabled`

### Key Differences from Web API

**Limitations:**

- Read-only (no write operations yet)
- No authentication
- Only local user's data (use userID `0` or actual user ID)
- No Atom format support
- Localized field/type names (except `/api/creatorFields`)
- No pagination limits by default
- `/api/searches/:searchKey/items` actually executes searches (not supported in web API)

**Benefits:**

- No rate limits
- Very fast (no network)
- Can return unlimited results
- Access to local-only features

### Common Headers

**Request:**

```none
Zotero-API-Version: 3 (optional, can also use ?v=3)
If-Modified-Since-Version: 123 (optional)
```

**Response:**

```none
Zotero-API-Version: 3
Zotero-Schema-Version: <schema version>
Last-Modified-Version: <version>
Total-Results: <count>
Link: <url>; rel="first", <url>; rel="next", ...
```

### Common Parameters

**Pagination:**

- `start=0` - Starting index
- `limit=100` - Max results (no default limit)

**Filtering:**

- `since=123` - Items modified after version 123
- `itemType=book` - Filter by item type
- `tag=tagname` - Filter by tag (supports OR with `||`, NOT with `-`)
- `q=search` - Quick search
- `qmode=titleCreatorYear|everything|startsWith` - Search mode

**Sorting:**

- `sort=dateModified|dateAdded|title|creator|itemType|...`
- `direction=asc|desc`

**Output:**

- `format=json|atom|keys|versions|bib|<export format>`
- `include=data,bib,citation,<export format>` (comma-separated)
- `style=chicago-note-bibliography` - CSL style ID
- `locale=en-US` - Locale for citations
- `linkwrap=1` - Wrap URLs/DOIs in links

**Export Formats:**
`bibtex`, `biblatex`, `bookmarks`, `coins`, `csljson`, `csv`, `mods`, `refer`, `rdf_bibliontology`, `rdf_dc`, `rdf_zotero`, `ris`, `tei`, `wikipedia`

---

### Local API Endpoints

#### Schema & Metadata

**`GET /api/`**
Root endpoint. Returns: `200 "Nothing to see here."`

**`GET /api/schema`**
Global schema JSON.

**`GET /api/itemTypes`**
All item types with localized names.

**`GET /api/itemFields`**
All item fields with localized names.

**`GET /api/itemTypeFields?itemType=book`**
Fields for specific item type.

**`GET /api/itemTypeCreatorTypes?itemType=book`**
Creator types for specific item type.

**`GET /api/creatorFields`**
Creator fields (always English: First, Last, Name).

---

#### User/Library Endpoints

**User Prefix:** `/api/users/:userID` (use 0 or actual user ID)

**`GET /api/users/:userID/settings`**
Returns empty object `{}`.

**`GET /api/users/:userID/groups`**
List all groups user belongs to.

**`GET /api/users/:userID/groups/:groupID`**
Get specific group metadata.

---

#### Group Endpoints

**Group Prefix:** `/api/groups/:groupID`

**`GET /api/groups/:groupID`**
Get group metadata.

---

#### Collections

**`GET /api/users/:userID/collections`**
All collections in user library (recursive).

**`GET /api/users/:userID/collections/top`**
Top-level collections only.

**`GET /api/users/:userID/collections/:collectionKey`**
Single collection.

**`GET /api/users/:userID/collections/:collectionKey/collections`**
Subcollections.

**Group variants:** Replace `/users/:userID` with `/groups/:groupID`

---

#### Items

**`GET /api/users/:userID/items`**
All items in library.

**`GET /api/users/:userID/items/top`**
Top-level items only (no children).

**`GET /api/users/:userID/items/trash`**
Deleted items.

**`GET /api/users/:userID/items/:itemKey`**
Single item.

**`GET /api/users/:userID/items/:itemKey/children`**
Child items (notes, attachments).

**`GET /api/collections/:collectionKey/items`**
Items in collection.

**`GET /api/collections/:collectionKey/items/top`**
Top-level items in collection.

**`GET /api/searches/:searchKey/items`**
Execute saved search and return matching items.

**`GET /api/users/:userID/publications/items`**
Publications (My Publications).

**Group variants:** Available for groups

**Search Parameters:**

- `?itemKey=ABC123,DEF456` - Specific items
- `?itemType=book` - Filter by type
- `?tag=important` - Filter by tag
- `?tag=tag1||tag2` - OR logic
- `?tag=-excluded` - Exclude tag
- `?q=search` - Quick search
- `?qmode=titleCreatorYear` - Search mode
- `?includeTrashed=1` - Include deleted items

---

#### Item Files

**`GET /api/users/:userID/items/:itemKey/file`**
Redirects to local file URL (302).

**`GET /api/users/:userID/items/:itemKey/file/view`**
Alias for `/file`.

**`GET /api/users/:userID/items/:itemKey/file/view/url`**
Returns file:// URL as text/plain.

---

#### Full Text

**`GET /api/users/:userID/items/:itemKey/fulltext`**
Cached full text for attachment.

**Response (200):**

```json
{
  "content": "extracted text content",
  "indexedPages": 10,
  "totalPages": 10,
  "indexedChars": 50000,
  "totalChars": 50000
}
```

**Headers:**

```none
Last-Modified-Version: <version>
```

**`GET /api/users/:userID/fulltext?since=123`**
Map of item keys to full text versions.

**Response:**

```json
{
  "ABC123": 456,
  "DEF456": 789
}
```

---

#### Saved Searches

**`GET /api/users/:userID/searches`**
All saved searches.

**`GET /api/users/:userID/searches/:searchKey`**
Single saved search.

**`GET /api/users/:userID/searches/:searchKey/items`**
Execute search (returns matching items).

---

#### Tags

**`GET /api/users/:userID/tags`**
All tags in library.

**`GET /api/users/:userID/tags/:tag`**
Single tag metadata.

**`GET /api/users/:userID/items/tags`**
Tags for items (with filtering).

**`GET /api/collections/:collectionKey/items/tags`**
Tags in collection.

**Parameters:**

- `?q=partial` - Filter tags
- `?qmode=startsWith` - Match mode
- `?itemQ=search` - Filter by item search
- `?itemTag=tag` - Filter by item tag

---

### Response Formats

#### JSON (default)

Full object with metadata:

```json
{
  "key": "ABC123",
  "version": 456,
  "library": {...},
  "links": {...},
  "meta": {...},
  "data": {
    "itemType": "journalArticle",
    "title": "Article Title",
    ...
  }
}
```

#### Keys

```list
ABC123
DEF456
GHI789
```

#### Versions

```json
{
  "ABC123": 456,
  "DEF456": 789
}
```

#### Bibliography

```html
<div class="csl-bib-body">
  <div class="csl-entry">Author. Title. Journal, 2023.</div>
</div>
```

#### Export Formats

Raw export format output (BibTeX, RIS, etc.).

---

## Integration Endpoints

For word processor integration and document editing.

### Document Integration (Connector-based)

**`POST /connector/document/execCommand`**

Execute an integration command (add citation, bibliography, etc.).

**Request Body (JSON):**

```json
{
  "command": "addCitation",
  "docId": "document-identifier"
}
```

**Response:**

- `200`: Next command to execute
- `503`: Integration already in progress

**Notes:**

- Bidirectional protocol: client calls `execCommand`, receives next command
- Client responds via `/connector/document/respond` with results
- Continues until `Document.complete` returned

---

**`POST /connector/document/respond`**

Respond to integration command with results.

**Request Body (JSON):**

```json
{
  "result": "command result data"
}
```

or error:

```json
{
  "error": "Alert",
  "message": "Error message",
  "stack": "stack trace"
}
```

---

**`POST /connector/sendToBack`**

Send Zotero to background (macOS focus management).

**Response:** 200

---

### Mac Word Integration

**`GET /integration/macWordCommand?agent=...&command=...&document=...&templateVersion=...`**

Execute Word integration command (macOS AppleScript bridge).

**Query Parameters:**

- `agent` - Integration client identifier
- `command` - Command to execute
- `document` - Document identifier (URL-encoded)
- `templateVersion` - Template version

**Response:** 200 (command executes asynchronously)

---

## Security Model

### Network Access

- Binds to `127.0.0.1` only (localhost)
- Not accessible from network
- Port configurable (default: 23119)

### CORS Protection

**Connector Endpoints:**

- Reject browser requests without proper identification
- Require `X-Zotero-Connector-API-Version` or `Zotero-Allowed-Request` header
- Whitelist: `/connector/ping` (no protection)
- Bookmarklet origin gets CORS headers

**Local API:**

- Can be disabled: `httpServer.localAPI.enabled` preference
- No authentication required (localhost trust model)
- User ID validation (only local user)

### Content-Type Validation

Endpoints specify `supportedDataTypes`:

- `application/json`
- `application/x-www-form-urlencoded`
- `multipart/form-data`
- `text/plain`
- `*` (any)

### Request Proxy Restrictions

`/connector/request` hardcoded allowlist:

- `www.worldcat.org` only
- HTTP/HTTPS only
- Validates User-Agent from browser

---

## Response Codes

### Success

- **200 OK** - Request succeeded
- **201 Created** - Resource created
- **204 No Content** - Success with no response body
- **302 Found** - Redirect (for file access)
- **304 Not Modified** - Resource unchanged (If-Modified-Since-Version)

### Client Errors

- **400 Bad Request** - Invalid parameters, malformed JSON, missing required fields
- **403 Forbidden** - Local API disabled, or CORS violation
- **404 Not Found** - Resource doesn't exist
- **409 Conflict** - Session already exists
- **412 Precondition Failed** - Version conflict

### Server Errors

- **500 Internal Server Error** - Unexpected error, library not editable
- **501 Not Implemented** - Unsupported HTTP method or API version
- **503 Service Unavailable** - Client offline, integration in progress
- **504 Gateway Timeout** - Operation timeout

---

## Code Examples

### Save Items from Connector

```javascript
// 1. Detect translators
const detectResponse = await fetch('http://localhost:23119/connector/detect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uri: 'https://example.com/article',
    html: document.documentElement.innerHTML,
    cookie: document.cookie
  })
});
const translators = await detectResponse.json();

// 2. Save items
const saveResponse = await fetch('http://localhost:23119/connector/saveItems', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionID: 'unique-session-id',
    uri: 'https://example.com/article',
    items: [{
      itemType: 'journalArticle',
      title: 'Article Title',
      creators: [{ firstName: 'John', lastName: 'Doe', creatorType: 'author' }]
    }]
  })
});
```

### Query Items via Local API

```javascript
const response = await fetch('http://localhost:23119/api/users/0/items?tag=important&limit=10', {
  headers: { 'Zotero-API-Version': '3' }
});
const items = await response.json();
```

### Get Item with Citation

```javascript
const response = await fetch(
  'http://localhost:23119/api/users/0/items/ABC123?include=data,bib&style=apa',
  { headers: { 'Zotero-API-Version': '3' } }
);
const result = await response.json();
console.log(result.data); // Item data
console.log(result.bib);  // Formatted citation
```

### Export Collection as BibTeX

```javascript
const response = await fetch(
  'http://localhost:23119/api/users/0/collections/COLL123/items?format=bibtex',
  { headers: { 'Zotero-API-Version': '3' } }
);
const bibtex = await response.text();
```

---

## Appendix: File Structure

```tree
zotero-source/chrome/content/zotero/xpcom/server/
├── server.js                      # Core HTTP server and request handling
├── server_connector.js            # Connector API endpoints (save, detect, etc.)
├── server_connectorIntegration.js # Document integration endpoints
├── server_integration.js          # Mac Word integration endpoint
├── server_localAPI.js             # Local API implementation
└── saveSession.js                 # Session management for save operations
```

---

## Version History

- **API Version 3** (Current)
  - Modern single-parameter endpoint signature
  - Enhanced session management
  - PDF recognition support
  - Local API with full query support

---

## References

- Zotero Source: <https://github.com/zotero/zotero>
- Web API Documentation: <https://www.zotero.org/support/dev/web_api/v3/start>
- Connector API used by Zotero browser extensions
- Local API enables tools like Obsidian, Alfred, Raycast to access Zotero

---

*Last Updated: 2025-01-12*
*Documentation generated from Zotero source code analysis*
