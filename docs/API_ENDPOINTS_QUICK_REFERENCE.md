# API Endpoints Quick Reference

**Base URL**: `http://localhost:23119/citationlinker`  
**Default Port**: `23119`

---

## URL Processing

### Process URL

**POST** `/processurl`  
Import webpage/article into Zotero library.

```json
// Request
{"url": "https://example.com/article"}

// Response
{"success": true, "items": [{...}], "method": "web_translation"}
```

---

### Preview URL

**POST** `/previewurl`  
Preview metadata without saving to library.

```json
// Request
{"url": "https://example.com/article"}

// Response (items not saved)
{"success": true, "mode": "preview", "items": [{...}]}
```

---

### Analyze URL

**POST** `/analyzeurl`  
Extract identifiers and metadata from URL.

```json
// Request
{"url": "https://doi.org/10.1234/example"}

// Response
{"success": true, "identifiers": {"DOI": "10.1234/example"}, "metadata": {...}}
```

---

### Process URL with AI

**POST** `/processurlwithai`  
Use Perplexity AI to enhance metadata extraction.

```json
// Request
{"url": "https://example.com/article"}

// Response
{"success": true, "items": [{...}], "aiEnhanced": true}
```

---

## Identifier Processing

### Process Identifier

**POST** `/processidentifier`  
Import item using DOI, ISBN, PMID, or arXiv ID.

```json
// Request
{"identifier": "10.1234/example.2024"}

// Response
{"success": true, "items": [{...}], "translator": "DOI"}
```

---

### Preview Identifier

**POST** `/previewidentifier`  
Preview identifier metadata without saving.

```json
// Request
{"identifier": "10.1234/example.2024"}

// Response (item not saved)
{"success": true, "mode": "preview", "items": [{...}]}
```

---

### Detect Identifier

**POST** `/detectidentifier`  
Extract identifiers from text.

```json
// Request
{"text": "DOI: 10.1234/example, ISBN: 978-0-123456-78-9"}

// Response
{"success": true, "identifiers": [{"type": "DOI", "value": "10.1234/example"}, ...]}
```

---

## PDF Processing

### Preview PDF

**POST** `/previewpdf`  
**Content-Type**: `multipart/form-data`  
Extract metadata and identifiers from PDF file.

```bash
# cURL
curl -X POST http://localhost:23119/citationlinker/previewpdf \
  -F "file=@document.pdf"
```

```json
// Response
{
  "success": true,
  "fileInfo": {"filename": "document.pdf", "size": 1234567},
  "extraction": {"pageCount": 10, "hasText": true},
  "identifiers": [{"type": "DOI", "value": "10.1234/example", "location": "page 1"}],
  "rawData": {"pages": [...]}
}
```

---

## Item Management

### Get Item

**GET** `/item?key=ABC123DEF`  
Retrieve item details by key.

```json
// Response
{"success": true, "data": {...}, "citation": "Author (2024)..."}
```

---

### Edit Item

**POST** `/edititem`  
**PATCH** `/edititem`  
Update item metadata (fields, creators, tags, collections).

```json
// Request
{
  "itemKey": "ABC123DEF",
  "fields": {"title": "New Title", "date": "2024-01-15"},
  "tags": ["updated", "revised"],
  "creators": [{"creatorType": "author", "firstName": "John", "lastName": "Doe"}]
}

// Response
{
  "success": true, 
  "updated": true,
  "updatedFields": ["title", "date", "tags", "creators"],
  "version": 124
}
```

---

### Delete Item

**POST** `/deleteitem`  
Permanently delete item from library.

```json
// Request
{"itemKey": "ABC123DEF"}

// Response
{"success": true, "message": "Item deleted successfully"}
```

---

### Item Key by URL

**POST** `/itemkeybyurl`  
Check if item with URL exists in library.

```json
// Request
{"url": "https://example.com/article"}

// Response
{"found": true, "itemKey": "ABC123DEF", "title": "Article Title"}
```

---

## Web Capture

### Save Webpage

**POST** `/savewebpage`  
Save webpage snapshot to library.

```json
// Request
{"url": "https://example.com", "title": "Example Page"}

// Response
{"success": true, "itemKey": "ABC123DEF", "message": "Webpage saved"}
```

---

## Common Response Fields

### Success Response

```json
{
  "success": true,
  "items": [...],           // Created/retrieved items
  "method": "...",          // How it was processed
  "timestamp": "..."        // ISO 8601 timestamp
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": 400,            // HTTP status code
    "timestamp": "..."
  }
}
```

---

## Item Object Structure

```json
{
  "itemKey": "ABC123DEF",
  "itemType": "journalArticle",
  "title": "Article Title",
  "creators": [{"firstName": "John", "lastName": "Doe", "creatorType": "author"}],
  "date": "2024",
  "DOI": "10.1234/example",
  "url": "https://example.com",
  "abstractNote": "...",
  "publicationTitle": "Journal Name",
  "generatedCitation": "Doe, J. (2024). Article Title..."
}
```

---

## Status Codes

- **200** - Success
- **400** - Bad request (invalid input)
- **404** - Item not found
- **413** - Payload too large (PDF > 50MB)
- **422** - Unprocessable (invalid PDF, no translators found)
- **500** - Internal server error

---

## Usage Examples

### Python

```python
import requests

# Process URL
response = requests.post(
    'http://localhost:23119/citationlinker/processurl',
    json={'url': 'https://doi.org/10.1234/example'}
)
print(response.json())

# Upload PDF
with open('paper.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:23119/citationlinker/previewpdf',
        files={'file': f}
    )
print(response.json())
```

### JavaScript

```javascript
// Process identifier
fetch('http://localhost:23119/citationlinker/processidentifier', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({identifier: '10.1234/example'})
})
.then(r => r.json())
.then(console.log);
```

### cURL

```bash
# Preview URL
curl -X POST http://localhost:23119/citationlinker/previewurl \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/article"}'

# Upload PDF
curl -X POST http://localhost:23119/citationlinker/previewpdf \
  -F "file=@document.pdf"
```

---

## Notes

- All endpoints are **localhost-only** for security
- Most endpoints accept `application/json`
- `/previewpdf` requires `multipart/form-data`
- Preview endpoints don't save items to library
- Process endpoints create permanent library items
- Duplicate detection is automatic for process endpoints
