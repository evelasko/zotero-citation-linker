# Zotero Item Types and Local HTTP API Documentation

> **Comprehensive guide to Zotero item structures and the local HTTP API for plugin development**

## Table of Contents

1. [Overview](#overview)
2. [Zotero Item Structure](#zotero-item-structure)
3. [Item Types and Fields](#item-types-and-fields)
4. [Creator System](#creator-system)
5. [Local HTTP API](#local-http-api)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Response Formats](#response-formats)
8. [Best Practices](#best-practices)

---

## Overview

The Zotero Local HTTP API provides programmatic access to your local Zotero library via HTTP requests. It supports querying items, collections, searches, and more, with full support for Zotero's rich item data model.

### Key Features

- **RESTful API**: Standard HTTP methods (GET, POST, etc.)
- **JSON responses**: All data returned in structured JSON format
- **Citation generation**: Built-in support for generating citations and bibliographies
- **Full-text search**: Access indexed full-text content
- **Multiple formats**: Export items in various formats (BibTeX, CSL-JSON, etc.)

### Server Configuration

- **Default Port**: 23119
- **Base URL**: `http://localhost:23119/api/`
- **API Version**: 3 (specified via `Zotero-API-Version` header or `?v=3` query param)
- **Authentication**: Local-only access (bound to 127.0.0.1)

---

## Zotero Item Structure

### Core Item Properties

Every Zotero item has these fundamental properties:

```javascript
{
  // Identity
  id: 12345,              // Internal database ID
  key: "ABC123DEF",       // Unique 8-character item key
  version: 1234,          // Item version number
  
  // Type
  itemType: "journalArticle",  // Item type name (string)
  itemTypeID: 2,              // Internal item type ID (integer)
  
  // Library
  libraryID: 1,           // Library identifier
  
  // Timestamps
  dateAdded: "2024-01-15 10:30:00",
  dateModified: "2024-01-16 14:20:00",
  
  // Parent-child relationships
  parentID: false,        // Parent item ID (false if top-level)
  parentKey: false,       // Parent item key (false if top-level)
  
  // State
  deleted: false,         // In trash
  synced: true,          // Synced to server
  inPublications: false   // In My Publications
}
```

### Item Data Structure

Items store field values in `_itemData` object indexed by field ID:

```javascript
{
  _itemData: {
    1: "Title of the Item",        // fieldID 1 = title
    2: "John",                      // fieldID 2 = firstName (of author)
    3: "Smith",                     // fieldID 3 = lastName
    10: "2024",                     // fieldID 10 = date
    // ... other fields
  }
}
```

### Item Types

Zotero supports 35+ item types, including:

#### Regular Items

- **Academic**: `journalArticle`, `book`, `bookSection`, `thesis`, `conferencePaper`, `report`
- **Media**: `webpage`, `blogPost`, `podcast`, `videoRecording`, `film`, `tvBroadcast`
- **Legal**: `case`, `statute`, `patent`, `hearing`, `bill`
- **Art**: `artwork`, `audioRecording`, `performance`, `map`, `presentation`
- **Other**: `manuscript`, `interview`, `letter`, `email`, `instantMessage`, `forumPost`

#### Special Types

- **`note`**: Standalone or child notes
- **`attachment`**: File attachments (PDF, HTML, snapshots, linked files)
- **`annotation`**: PDF annotations (highlights, notes, images, ink)

### Type-Specific Properties

#### Regular Items

```javascript
{
  // Metadata fields (varies by type)
  title: "Article Title",
  abstractNote: "Article abstract...",
  publicationTitle: "Journal Name",
  volume: "10",
  issue: "2",
  pages: "123-145",
  date: "2024-01-15",
  DOI: "10.1234/example",
  url: "https://example.com/article",
  
  // Creators (authors, editors, etc.)
  creators: [
    {
      creatorType: "author",
      firstName: "John",
      lastName: "Smith"
    }
  ],
  
  // Tags
  tags: [
    { tag: "machine learning", type: 0 },  // type 0 = manual tag
    { tag: "AI", type: 1 }                 // type 1 = automatic tag
  ],
  
  // Collections
  collections: ["COLLKEY1", "COLLKEY2"],
  
  // Relations
  relations: {
    "owl:sameAs": ["http://example.com/item"]
  }
}
```

#### Attachment Items

```javascript
{
  itemType: "attachment",
  
  // Attachment-specific fields
  attachmentLinkMode: 1,        // 0=imported_file, 1=linked_file, 2=imported_url, 3=linked_url
  attachmentContentType: "application/pdf",
  attachmentCharset: null,
  attachmentPath: "storage:example.pdf",  // Or absolute path for linked files
  attachmentFilename: "example.pdf",
  
  // Sync state
  attachmentSyncState: 0,       // 0=to_upload, 1=in_sync, 2=force_upload, 3=force_download
  attachmentSyncedHash: "abc123...",
  
  // Parent
  parentKey: "PARENTKEY",       // Parent item key
  
  // Standard metadata
  title: "Document Title",
  url: "https://example.com/doc.pdf",
  accessDate: "2024-01-15",
  tags: []
}
```

#### Note Items

```javascript
{
  itemType: "note",
  note: "<p>Note content in HTML</p>",
  
  // Parent (if child note)
  parentKey: "PARENTKEY",
  
  // No other fields except tags
  tags: []
}
```

#### Annotation Items

```javascript
{
  itemType: "annotation",
  
  // Parent attachment
  parentKey: "ATTACHMENTKEY",
  
  // Annotation properties
  annotationType: "highlight",      // highlight, underline, note, text, image, ink
  annotationAuthorName: "John Smith",
  annotationText: "Selected text",  // For highlights/underlines
  annotationComment: "My comment",
  annotationColor: "#ffd400",       // Hex color code
  annotationPageLabel: "5",
  annotationSortIndex: "00005|002345|00123",  // For positioning
  annotationPosition: '{"pageIndex": 4, ...}', // JSON string
  annotationIsExternal: false,
  
  // For image/ink annotations
  annotationImage: <blob>,  // Binary image data
  
  tags: []
}
```

---

## Item Types and Fields

### Field System Architecture

Zotero uses a sophisticated field system with:

- **Base fields**: Generic field types (e.g., `publisher`)
- **Type-specific fields**: Specialized variants (e.g., `label` for audio recordings, `studio` for films)
- **Field mapping**: Automatic mapping between base and type-specific fields

### Common Base Fields

```javascript
// Core bibliographic fields
title              // Base field for all titles
date               // Base field for dates
publisher          // Maps to: label, studio, network, university, company, etc.
publicationTitle   // Maps to: bookTitle, proceedingsTitle, programTitle, etc.
place              // Maps to: artworkMedium, interviewMedium, meetingName, etc.
type               // Maps to: manuscriptType, letterType, presentationType, etc.
medium             // Various medium fields

// Identifiers
DOI                // Digital Object Identifier
ISBN               // International Standard Book Number
ISSN               // International Standard Serial Number
url                // Web address

// Descriptive fields
abstractNote       // Abstract or summary
rights             // Copyright information
language           // Language code
archive            // Archive name
archiveLocation    // Location in archive
callNumber         // Library call number
extra              // Extra field for additional data

// Numeric fields
volume             // Volume number
issue              // Issue number
pages              // Page numbers or range
numPages           // Total number of pages
numberOfVolumes    // Total volumes

// Dates
date               // Publication date
accessDate         // Date accessed (for online resources)
```

### Field Validation

#### Field Types

1. **Text Fields**: Standard string fields
2. **Date Fields**: Support multipart dates (year-month-day)
3. **Integer Fields**: Numeric values only
4. **URL Fields**: Must be valid URLs
5. **Multiline Fields**: `abstractNote`, `extra`, `address`

#### Field Direction

Fields have text direction based on content:

- **LTR**: Identifiers, numbers, URLs (ISBN, DOI, volume, pages)
- **Auto**: Most text fields (title, abstract) - detect from language
- **RTL**: Right-to-left languages (Arabic, Hebrew)

### Getting Field Information

```javascript
// Get field ID from name
let fieldID = Zotero.ItemFields.getID('title');  // Returns field ID

// Get field name from ID
let fieldName = Zotero.ItemFields.getName(fieldID);  // Returns 'title'

// Check if field is valid for item type
let isValid = Zotero.ItemFields.isValidForType(fieldID, itemTypeID);

// Get all fields for an item type
let fields = Zotero.ItemFields.getItemTypeFields(itemTypeID);

// Check if field is a base field
let isBase = Zotero.ItemFields.isBaseField(fieldID);

// Get type-specific field from base field
let specificField = Zotero.ItemFields.getFieldIDFromTypeAndBase('audioRecording', 'publisher');
// Returns field ID for 'label'

// Get base field from type-specific field
let baseField = Zotero.ItemFields.getBaseIDFromTypeAndField('audioRecording', 'label');
// Returns field ID for 'publisher'
```

---

## Creator System

### Creator Structure

Creators (authors, editors, contributors, etc.) are stored separately and linked to items:

```javascript
// Creator with first and last name
{
  creatorType: "author",    // author, editor, contributor, translator, etc.
  firstName: "John",
  lastName: "Smith",
  fieldMode: 0              // 0 = first/last, 1 = single field
}

// Creator with single name field (institutions, mononyms)
{
  creatorType: "author",
  name: "Harvard University",  // Used instead of firstName/lastName
  fieldMode: 1
}
```

### Creator Types

Common creator types include:

- **author**: Primary creator
- **editor**: Editor
- **contributor**: Contributor
- **translator**: Translator
- **seriesEditor**: Series editor
- **reviewer**: Reviewer
- **director**: Director (films, broadcasts)
- **producer**: Producer
- **performer**: Performer
- **composer**: Composer
- **artist**: Artist
- **interviewee**: Person interviewed
- **interviewer**: Interviewer
- **programmer**: Programmer (software)
- **presenter**: Presenter

### Creator Methods

```javascript
// Get creators array
let creators = item.getCreators();

// Get specific creator
let creator = item.getCreator(0);  // Get first creator

// Set creators
item.setCreators([
  {
    creatorType: 'author',
    firstName: 'Jane',
    lastName: 'Doe'
  },
  {
    creatorType: 'editor',
    firstName: 'John',
    lastName: 'Smith'
  }
]);

// Get first creator string
let firstCreator = item.firstCreator;  // Returns formatted name

// Get sort creator
let sortCreator = item.sortCreator;    // For sorting
```

### Creator Formatting

Zotero automatically formats creator names:

- **firstName + lastName**: "John Smith"
- **Single name**: "Harvard University"
- **Bidi isolates**: Proper formatting for mixed LTR/RTL text
- **Sort key**: Generated for alphabetical sorting

---

## Local HTTP API

### Enabling the Local API

The local API must be enabled in Zotero preferences:

```javascript
// Check if enabled
let enabled = Zotero.Prefs.get('httpServer.localAPI.enabled');

// Enable programmatically (requires restart)
Zotero.Prefs.set('httpServer.localAPI.enabled', true);
```

### API Versioning

Current API version is 3. Specify version via:

```http
GET /api/users/0/items
Zotero-API-Version: 3
```

Or via query parameter:

```http
GET /api/users/0/items?v=3
```

### User and Group Libraries

- **User Library**: Use `userID=0` or current user ID
- **Group Libraries**: Use actual group ID from `Zotero.Groups.getAll()`

```http
# User library
GET /api/users/0/items

# Group library
GET /api/groups/12345/items
```

### Request Headers

```http
Zotero-API-Version: 3              # API version (required)
If-Modified-Since-Version: 1234    # Conditional request
```

### Response Headers

```http
HTTP/1.1 200 OK
Content-Type: application/json
Total-Results: 150                 # Total items available
Last-Modified-Version: 1234        # Library version
Link: <url>; rel="next", ...      # Pagination links
```

---

## API Endpoints Reference

### Schema and Metadata

#### Get API Root

```http
GET /api/
```

Returns basic API information.

#### Get Schema

```http
GET /api/schema
```

Returns the complete Zotero schema with item types, fields, and creator types.

#### Get Item Types

```http
GET /api/itemTypes
```

Returns array of all item types:

```json
[
  {
    "itemType": "journalArticle",
    "localized": "Journal Article"
  },
  ...
]
```

#### Get Item Fields

```http
GET /api/itemFields
```

Returns array of all fields.

#### Get Item Type Fields

```http
GET /api/itemTypeFields?itemType=journalArticle
```

Returns fields valid for specific item type.

#### Get Item Type Creator Types

```http
GET /api/itemTypeCreatorTypes?itemType=journalArticle
```

Returns creator types valid for specific item type.

#### Get Creator Fields

```http
GET /api/creatorFields
```

Returns creator field types.

### Collections

#### List Collections

```http
GET /api/users/:userID/collections
GET /api/groups/:groupID/collections
```

Query parameters:

- `since=<version>`: Only return collections modified since version
- `start=<int>`: Starting index for pagination
- `limit=<int>`: Number of results to return
- `sort=<field>`: Sort field (title, dateAdded, dateModified)
- `direction=asc|desc`: Sort direction

#### Get Single Collection

```http
GET /api/users/:userID/collections/:collectionKey
GET /api/groups/:groupID/collections/:collectionKey
```

### Items

#### List Items

```http
GET /api/users/:userID/items
GET /api/groups/:groupID/items
```

Query parameters:

- **Pagination**:
  - `start=<int>`: Starting index (default: 0)
  - `limit=<int>`: Number of results (default: all)
  
- **Filtering**:
  - `itemType=<type>`: Filter by item type
  - `q=<search>`: Full-text search
  - `qmode=everything|titleCreatorYear`: Search mode
  - `tag=<tag>`: Filter by tag (can be repeated)
  - `collection=<key>`: Items in collection
  - `since=<version>`: Modified since version
  
- **Sorting**:
  - `sort=<field>`: Sort field (dateAdded, dateModified, title, creator, itemType, etc.)
  - `direction=asc|desc`: Sort direction
  
- **Formatting**:
  - `include=data,bib,citation`: Include additional formats
  - `style=<style>`: Citation style (default: chicago-note-bibliography)
  - `locale=<locale>`: Locale for citations (default: en-US)
  - `linkwrap=1`: Wrap URLs and DOIs in links

Example:

```http
GET /api/users/0/items?itemType=journalArticle&tag=AI&limit=50&sort=dateAdded&direction=desc&include=data,citation&style=apa
```

#### Get Single Item

```http
GET /api/users/:userID/items/:itemKey
GET /api/groups/:groupID/items/:itemKey
```

Query parameters:

- `include=data,bib,citation,...`: Include formats
- `style=<style>`: Citation style
- `locale=<locale>`: Locale

#### Get Top-Level Items

```http
GET /api/users/:userID/items/top
GET /api/groups/:groupID/items/top
```

Returns only top-level items (not child notes/attachments).

#### Get Child Items

```http
GET /api/users/:userID/items/:itemKey/children
GET /api/groups/:groupID/items/:itemKey/children
```

Returns child notes and attachments for an item.

### Attachments

#### Get Attachment File

```http
GET /api/users/:userID/items/:itemKey/file
GET /api/groups/:groupID/items/:itemKey/file
```

Returns 302 redirect to `zotero://` URL for file.

#### Get Attachment File URL

```http
GET /api/users/:userID/items/:itemKey/file/view/url
GET /api/groups/:groupID/items/:itemKey/file/view/url
```

Returns plain text `zotero://` URL.

#### Get Full Text

```http
GET /api/users/:userID/items/:itemKey/fulltext
GET /api/groups/:groupID/items/:itemKey/fulltext
```

Returns full-text content and indexing statistics:

```json
{
  "content": "Full text content...",
  "indexedPages": 10,
  "totalPages": 10,
  "indexedChars": 5000,
  "totalChars": 5000
}
```

#### Get Full Text Versions

```http
GET /api/users/:userID/fulltext
GET /api/groups/:groupID/fulltext
```

Query parameters:

- `since=<version>`: Return items with full text modified since version

Returns:

```json
{
  "ABC123": 1234,
  "DEF456": 1235
}
```

### Searches

#### List Searches

```http
GET /api/users/:userID/searches
GET /api/groups/:groupID/searches
```

#### Get Single Search

```http
GET /api/users/:userID/searches/:searchKey
GET /api/groups/:groupID/searches/:searchKey
```

### Tags

#### List Tags

```http
GET /api/users/:userID/tags
GET /api/groups/:groupID/tags
```

#### Get Single Tag

```http
GET /api/users/:userID/tags/:tag
GET /api/groups/:groupID/tags/:tag
```

---

## Response Formats

### Standard Item Response

```json
{
  "key": "ABC123DEF",
  "version": 1234,
  "library": {
    "type": "user",
    "id": 12345,
    "name": "username",
    "links": {
      "alternate": {
        "href": "https://www.zotero.org/username",
        "type": "text/html"
      }
    }
  },
  "links": {
    "self": {
      "href": "http://localhost:23119/api/users/0/items/ABC123DEF",
      "type": "application/json"
    },
    "alternate": {
      "href": "https://www.zotero.org/username/items/ABC123DEF",
      "type": "text/html"
    }
  },
  "meta": {
    "creatorSummary": "Smith et al.",
    "parsedDate": "2024-01-15",
    "numChildren": 2
  },
  "data": {
    "key": "ABC123DEF",
    "version": 1234,
    "itemType": "journalArticle",
    "title": "Example Article Title",
    "creators": [
      {
        "creatorType": "author",
        "firstName": "John",
        "lastName": "Smith"
      }
    ],
    "abstractNote": "Article abstract...",
    "publicationTitle": "Journal Name",
    "volume": "10",
    "issue": "2",
    "pages": "123-145",
    "date": "2024-01-15",
    "series": "",
    "seriesTitle": "",
    "seriesText": "",
    "journalAbbreviation": "J. Name",
    "language": "en",
    "DOI": "10.1234/example",
    "ISSN": "1234-5678",
    "shortTitle": "",
    "url": "https://example.com/article",
    "accessDate": "2024-01-15T10:30:00Z",
    "archive": "",
    "archiveLocation": "",
    "libraryCatalog": "",
    "callNumber": "",
    "rights": "",
    "extra": "",
    "tags": [
      {
        "tag": "machine learning",
        "type": 0
      }
    ],
    "collections": ["COLLKEY1"],
    "relations": {},
    "dateAdded": "2024-01-15T10:30:00Z",
    "dateModified": "2024-01-16T14:20:00Z"
  }
}
```

### With Bibliography Format

When `include=bib` is specified:

```json
{
  "key": "ABC123DEF",
  "version": 1234,
  "library": { ... },
  "links": { ... },
  "meta": { ... },
  "data": { ... },
  "bib": "<div class=\"csl-entry\">Smith, John. "Example Article Title." <i>Journal Name</i> 10, no. 2 (2024): 123–45. https://doi.org/10.1234/example.</div>"
}
```

### With Citation Format

When `include=citation` is specified:

```json
{
  "key": "ABC123DEF",
  "version": 1234,
  "library": { ... },
  "links": { ... },
  "meta": { ... },
  "data": { ... },
  "citation": "<span class=\"citation\">(Smith 2024)</span>"
}
```

### Export Formats

When `include=<format>` with export format:

Supported formats:

- `bibtex`: BibTeX
- `biblatex`: BibLaTeX
- `bookmarks`: Netscape Bookmarks
- `coins`: COinS
- `csljson`: CSL JSON
- `csv`: CSV
- `endnote_xml`: EndNote XML
- `mods`: MODS
- `refer`: Refer/BibIX
- `rdf_bibliontology`: Bibliontology RDF
- `rdf_dc`: Dublin Core RDF
- `rdf_zotero`: Zotero RDF
- `ris`: RIS
- `tei`: TEI
- `wikipedia`: Wikipedia Citation Templates

Example with BibTeX:

```json
{
  "key": "ABC123DEF",
  "version": 1234,
  "library": { ... },
  "links": { ... },
  "meta": { ... },
  "data": { ... },
  "bibtex": "@article{smith_example_2024,\n\ttitle = {Example Article Title},\n\tvolume = {10},\n\tissn = {1234-5678},\n\turl = {https://example.com/article},\n\tdoi = {10.1234/example},\n\tnumber = {2},\n\tjournal = {Journal Name},\n\tauthor = {Smith, John},\n\tyear = {2024},\n\tpages = {123--145},\n}\n"
}
```

### Collection Response

```json
{
  "key": "COLLKEY1",
  "version": 100,
  "library": { ... },
  "links": { ... },
  "meta": {
    "numCollections": 2,
    "numItems": 15
  },
  "data": {
    "key": "COLLKEY1",
    "version": 100,
    "name": "My Collection",
    "parentCollection": false,
    "relations": {}
  }
}
```

### Tag Response

```json
{
  "tag": "machine learning",
  "type": 0,
  "numItems": 25,
  "links": {
    "self": {
      "href": "http://localhost:23119/api/users/0/tags/machine%20learning",
      "type": "application/json"
    }
  }
}
```

---

## Best Practices

### Performance Optimization

1. **Use Pagination**: Always use `start` and `limit` for large result sets

    ```http
    GET /api/users/0/items?start=0&limit=100
    ```

2. **Filter Early**: Use `itemType`, `tag`, `collection` to reduce results

    ```http
    GET /api/users/0/items?itemType=journalArticle&collection=COLLKEY1
    ```

3. **Conditional Requests**: Use `If-Modified-Since-Version` to avoid fetching unchanged data

    ```http
    GET /api/users/0/items
    If-Modified-Since-Version: 1234
    ```

4. **Select Only Needed Formats**: Don't request `bib` or `citation` unless needed

    ```http
    GET /api/users/0/items?include=data
    ```

### Error Handling

```javascript
try {
  let response = await fetch('http://localhost:23119/api/users/0/items/ABC123');
  
  if (response.status === 404) {
    // Item not found
    console.error('Item does not exist');
  } else if (response.status === 403) {
    // Local API not enabled
    console.error('Local API is not enabled in Zotero');
  } else if (response.status === 304) {
    // Not modified
    console.log('Data not modified since last request');
  } else if (response.ok) {
    let data = await response.json();
    // Process data
  } else {
    console.error('Unexpected error:', response.status);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### Common HTTP Status Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `204 No Content`: Success with no content
- `304 Not Modified`: Content not modified (conditional request)
- `400 Bad Request`: Invalid request parameters
- `403 Forbidden`: Local API not enabled or unauthorized
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error
- `501 Not Implemented`: API version not supported

### Working with Item Data

#### Creating Items

To create items via the API, you need to construct proper item data:

```javascript
// Get template for item type
let template = Zotero.Items.getTemplate('journalArticle');

// Fill in data
template.title = 'Article Title';
template.creators = [
  {
    creatorType: 'author',
    firstName: 'John',
    lastName: 'Smith'
  }
];
template.date = '2024-01-15';
template.publicationTitle = 'Journal Name';

// Create item
let item = new Zotero.Item();
item.fromJSON(template);
await item.saveTx();
```

#### Updating Items

```javascript
// Get item
let item = await Zotero.Items.getByLibraryAndKeyAsync(libraryID, itemKey);

// Modify fields
item.setField('title', 'New Title');
item.setField('date', '2024-01-15');

// Save
await item.saveTx();
```

#### Working with Creators

```javascript
// Get creators
let creators = item.getCreators();

// Modify creators
creators.push({
  creatorType: 'editor',
  firstName: 'Jane',
  lastName: 'Doe'
});

// Set creators
item.setCreators(creators);

// Save
await item.saveTx();
```

#### Working with Tags

```javascript
// Add tag
item.addTag('new tag', 0);  // 0 = manual, 1 = automatic

// Remove tag
item.removeTag('old tag');

// Set all tags
item.setTags([
  { tag: 'tag1', type: 0 },
  { tag: 'tag2', type: 0 }
]);

// Save
await item.saveTx();
```

### Search Syntax

The API supports Zotero's search syntax:

```http
# Items with tag "AI"
GET /api/users/0/items?tag=AI

# Items with tag "AI" OR "machine learning"
GET /api/users/0/items?tag=AI||machine%20learning

# Items with tag "AI" but NOT "deep learning"
GET /api/users/0/items?tag=AI&tag=-deep%20learning

# Multiple tags (AND logic)
GET /api/users/0/items?tag=AI&tag=machine%20learning

# Escape leading dash
GET /api/users/0/items?tag=\-negative
```

### Citation Styles

Popular citation styles:

- `chicago-note-bibliography`: Chicago Manual of Style (notes and bibliography)
- `apa`: APA 7th edition
- `mla`: MLA 9th edition
- `harvard1`: Harvard
- `ieee`: IEEE
- `nature`: Nature
- `science`: Science
- `vancouver`: Vancouver
- `elsevier-harvard`: Elsevier Harvard

Custom styles can be specified by full URL:

```http
GET /api/users/0/items?include=bib&style=https://www.zotero.org/styles/custom-style
```

### Full-Text Search

```javascript
// Search full text
let results = await Zotero.Fulltext.searchAsync(
  'machine learning',
  [libraryID],
  {
    quicksearch: false,
    includePDFs: true
  }
);
```

### Handling Attachments

```javascript
// Check if item is attachment
if (item.isAttachment()) {
  // Get attachment info
  let linkMode = item.attachmentLinkMode;
  let contentType = item.attachmentContentType;
  let filename = item.attachmentFilename;
  
  // Get file path
  let path = await item.getFilePathAsync();
  
  // Check if file exists
  let exists = await item.fileExists();
}
```

### Working with PDF Annotations

```javascript
// Get annotations for attachment
let annotations = item.getAnnotations();

// Filter by type
let highlights = annotations.filter(a => a.annotationType === 'highlight');
let notes = annotations.filter(a => a.annotationType === 'note');

// Get annotation properties
for (let annotation of annotations) {
  console.log('Type:', annotation.annotationType);
  console.log('Text:', annotation.annotationText);
  console.log('Comment:', annotation.annotationComment);
  console.log('Page:', annotation.annotationPageLabel);
  console.log('Color:', annotation.annotationColor);
}
```

### Library Management

```javascript
// Get user library
let userLibrary = Zotero.Libraries.userLibrary;

// Get all group libraries
let groups = Zotero.Groups.getAll();

// Get group library ID
let groupID = 12345;
let libraryID = Zotero.Groups.getLibraryIDFromGroupID(groupID);

// Wait for library to load
await library.waitForDataLoad('item');
```

---

## Advanced Topics

### Custom Endpoints

You can create custom endpoints for your plugin:

```javascript
// Define endpoint class
const MyEndpoint = function() {};
MyEndpoint.prototype = {
  supportedMethods: ['GET', 'POST'],
  supportedDataTypes: ['application/json'],
  
  init: async function(requestData) {
    let { pathname, searchParams, data } = requestData;
    
    // Handle request
    try {
      let result = await this.processRequest(data);
      return [200, 'application/json', JSON.stringify(result)];
    } catch (error) {
      return [500, 'text/plain', error.message];
    }
  },
  
  processRequest: async function(data) {
    // Your logic here
    return { status: 'success' };
  }
};

// Register endpoint
Zotero.Server.Endpoints['/my-plugin/custom-endpoint'] = MyEndpoint;
```

### Request Validation

```javascript
validateRequest(requestData) {
  // Check required parameters
  if (!requestData.searchParams.has('itemKey')) {
    throw new Error('itemKey parameter required');
  }
  
  // Validate item key format
  let itemKey = requestData.searchParams.get('itemKey');
  if (!/^[A-Z0-9]{8}$/.test(itemKey)) {
    throw new Error('Invalid item key format');
  }
  
  return true;
}
```

### CORS Headers

For cross-origin requests (if needed):

```javascript
return [
  200,
  {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST',
    'Access-Control-Allow-Headers': 'Content-Type'
  },
  JSON.stringify(data)
];
```

---

## Appendix

### Common Item Type Fields

#### Journal Article

- title, creators, abstractNote, publicationTitle
- volume, issue, pages, date, series, seriesTitle, seriesText
- journalAbbreviation, language, DOI, ISSN
- shortTitle, url, accessDate, archive, archiveLocation
- libraryCatalog, callNumber, rights, extra

#### Book

- title, creators, abstractNote, series, seriesNumber
- volume, numberOfVolumes, edition, place, publisher, date
- numPages, language, ISBN, shortTitle
- url, accessDate, archive, archiveLocation
- libraryCatalog, callNumber, rights, extra

#### Book Section

- title, creators, abstractNote, bookTitle
- series, seriesNumber, volume, numberOfVolumes, edition
- place, publisher, date, pages, language, ISBN
- shortTitle, url, accessDate, archive, archiveLocation
- libraryCatalog, callNumber, rights, extra

#### Thesis

- title, creators, abstractNote, thesisType
- university, place, date, numPages, language
- shortTitle, url, accessDate, archive, archiveLocation
- libraryCatalog, callNumber, rights, extra

#### Webpage

- title, creators, abstractNote, websiteTitle, websiteType
- date, shortTitle, url, accessDate, language, rights, extra

#### Conference Paper

- title, creators, abstractNote, date, proceedingsTitle
- conferenceName, place, publisher, volume, pages
- series, language, DOI, ISBN, shortTitle
- url, accessDate, archive, archiveLocation
- libraryCatalog, callNumber, rights, extra

### Item Type IDs

Common item type IDs (these are stable):

```none
1  = note
2  = book
3  = bookSection
4  = journalArticle
5  = magazineArticle
6  = newspaperArticle
7  = thesis
8  = letter
9  = manuscript
10 = interview
11 = film
12 = artwork
13 = website (deprecated, use webpage)
14 = attachment
15 = report
16 = bill
17 = case
18 = hearing
19 = patent
20 = statute
21 = email
22 = map
23 = blogPost
24 = instantMessage
25 = forumPost
26 = audioRecording
27 = presentation
28 = videoRecording
29 = tvBroadcast
30 = radioBroadcast
31 = podcast
32 = computerProgram
33 = conferencePaper
34 = document
35 = encyclopediaArticle
36 = dictionaryEntry
37 = webpage
38 = annotation
```

### Useful Zotero Methods

```javascript
// Item creation
Zotero.Items.getTemplate(itemType)
item.fromJSON(json)

// Field access
item.getField(field, unformatted, includeBaseMapped)
item.setField(field, value, loadIn)
item.getUsedFields(asNames)

// Creators
item.getCreators()
item.setCreators(creators)
item.getCreator(index)
item.setCreator(index, creator)

// Tags
item.getTags()
item.setTags(tags)
item.addTag(tag, type)
item.removeTag(tag)

// Collections
item.getCollections()
item.setCollections(collections)
item.addToCollection(collectionID)
item.removeFromCollection(collectionID)

// Child items
item.getNotes(includeTrashed)
item.getAttachments(includeTrashed)
item.getAnnotations(includeTrashed)

// Type checks
item.isRegularItem()
item.isNote()
item.isAttachment()
item.isAnnotation()
item.isTopLevelItem()

// Saving
await item.saveTx(options)
await item.eraseTx(options)
```

---

## References

- **Zotero API Documentation**: <https://www.zotero.org/support/dev/web_api/v3/start>
- **Zotero Source Code**: <https://github.com/zotero/zotero>
- **Zotero Schema**: <https://api.zotero.org/schema>
- **Citation Styles**: <https://www.zotero.org/styles>

---

## Changelog

- **2024-01-15**: Initial documentation created
- Covers Zotero 7 Local API implementation
- Based on Zotero source code analysis

---

**Note**: This documentation is based on Zotero's internal implementation and may change in future versions. Always refer to the official Zotero documentation for the most up-to-date information.
